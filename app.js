import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import {GALLERY,SCENES} from "./scenes.js";

const viewer=document.querySelector("#viewer"),fade=document.querySelector("#fade"),title=document.querySelector("#sceneTitle"),gyroBtn=document.querySelector("#gyroButton"),prev=document.querySelector("#previousButton"),galleryBtn=document.querySelector("#galleryButton"),next=document.querySelector("#nextButton"),errorBox=document.querySelector("#errorBox");
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;viewer.appendChild(renderer.domElement);

const scene=new THREE.Scene(),rig=new THREE.Object3D(),camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,.01,2000);
rig.add(camera);scene.add(rig);
const geometry=new THREE.SphereGeometry(100,64,40);geometry.scale(-1,1,1);

let sphere=null,texture=null,video=null,index=0,mode="gallery",loading=false,gyro=false,orientation=null,screenAngle=0,yaw=0,pitch=0,down=false,px=0,py=0,pinch=0;
const zee=new THREE.Vector3(0,0,1),euler=new THREE.Euler(),q0=new THREE.Quaternion(),q1=new THREE.Quaternion(-Math.sqrt(.5),0,0,Math.sqrt(.5));

const raycaster=new THREE.Raycaster();
const pointer=new THREE.Vector2();

let pointerStartX=0,pointerStartY=0,pointerMoved=false;
let editorMode=false;
let editorPoints=[];
let draggedMarkerIndex=null;

const HOTSPOT_STORAGE_KEY="tz-viewer-hotspots-v2";
const HOTSPOT_RADIUS=0.085;

const editorLayer=document.createElement("div");
editorLayer.id="hotspotEditorLayer";
Object.assign(editorLayer.style,{
  position:"fixed",
  inset:"0",
  zIndex:"35",
  pointerEvents:"none",
  display:"none"
});
document.body.appendChild(editorLayer);

const editorPanel=document.createElement("div");
editorPanel.id="hotspotEditorPanel";
Object.assign(editorPanel.style,{
  position:"fixed",
  left:"14px",
  bottom:"14px",
  zIndex:"50",
  maxWidth:"420px",
  padding:"12px",
  borderRadius:"14px",
  background:"rgba(0,0,0,.86)",
  color:"#fff",
  fontFamily:"Arial,Helvetica,sans-serif",
  lineHeight:"1.35",
  display:"none"
});
editorPanel.innerHTML=`
  <div style="font-weight:700;margin-bottom:7px">Éditeur des liens</div>
  <div id="editorInstruction" style="margin-bottom:9px"></div>
  <div style="display:flex;flex-wrap:wrap;gap:7px">
    <button id="editorUndo" type="button">Annuler le dernier</button>
    <button id="editorSave" type="button">Enregistrer</button>
    <button id="editorExport" type="button">Exporter</button>
    <button id="editorClear" type="button">Tout effacer</button>
    <button id="editorClose" type="button">Fermer</button>
  </div>
`;
document.body.appendChild(editorPanel);

const editorInstruction=editorPanel.querySelector("#editorInstruction");
const editorUndo=editorPanel.querySelector("#editorUndo");
const editorSave=editorPanel.querySelector("#editorSave");
const editorExport=editorPanel.querySelector("#editorExport");
const editorClear=editorPanel.querySelector("#editorClear");
const editorClose=editorPanel.querySelector("#editorClose");

function loadStoredHotspots(){
  try{
    const parsed=JSON.parse(localStorage.getItem(HOTSPOT_STORAGE_KEY)||"null");
    return Array.isArray(parsed)?parsed.filter(p=>
      Number.isInteger(p.scene)&&
      Number.isFinite(p.u)&&
      Number.isFinite(p.v)
    ).slice(0,SCENES.length):[];
  }catch{
    return [];
  }
}

function saveStoredHotspots(){
  localStorage.setItem(HOTSPOT_STORAGE_KEY,JSON.stringify(editorPoints));
}

editorPoints=loadStoredHotspots();

function updateEditorInstruction(){
  if(!editorMode)return;
  if(editorPoints.length<SCENES.length){
    const number=String(editorPoints.length+1).padStart(2,"0");
    editorInstruction.innerHTML=
      `Clique au centre de la zone <strong>${number}</strong>.<br>`+
      `Tu pourras ensuite déplacer les pastilles numérotées.`;
  }else{
    editorInstruction.innerHTML=
      `Les 10 zones sont placées. Déplace les pastilles si nécessaire, puis clique sur <strong>Enregistrer</strong>.`;
  }
}

function uvToWorldPosition(uv){
  const phi=uv.u*Math.PI*2;
  const theta=(1-uv.v)*Math.PI;
  const radius=99.5;
  return new THREE.Vector3(
    radius*Math.cos(phi)*Math.sin(theta),
    radius*Math.cos(theta),
    radius*Math.sin(phi)*Math.sin(theta)
  );
}

function createMarker(point,index){
  const marker=document.createElement("button");
  marker.type="button";
  marker.textContent=String(index+1).padStart(2,"0");
  marker.dataset.index=String(index);
  Object.assign(marker.style,{
    position:"absolute",
    width:"46px",
    height:"46px",
    margin:"-23px 0 0 -23px",
    borderRadius:"50%",
    border:"2px solid #fff",
    background:"rgba(255,0,120,.84)",
    color:"#fff",
    fontWeight:"700",
    fontSize:"15px",
    cursor:"grab",
    pointerEvents:"auto",
    boxShadow:"0 2px 12px rgba(0,0,0,.65)"
  });

  marker.addEventListener("pointerdown",event=>{
    if(!editorMode)return;
    draggedMarkerIndex=Number(marker.dataset.index);
    marker.style.cursor="grabbing";
    marker.setPointerCapture(event.pointerId);
    event.stopPropagation();
  });

  marker.addEventListener("pointermove",event=>{
    if(draggedMarkerIndex!==Number(marker.dataset.index))return;
    setHotspotFromScreen(draggedMarkerIndex,event.clientX,event.clientY);
    event.stopPropagation();
  });

  marker.addEventListener("pointerup",event=>{
    if(draggedMarkerIndex===Number(marker.dataset.index)){
      draggedMarkerIndex=null;
      marker.style.cursor="grab";
      try{marker.releasePointerCapture(event.pointerId)}catch{}
    }
    event.stopPropagation();
  });

  return marker;
}

function rebuildEditorMarkers(){
  editorLayer.replaceChildren();
  editorPoints.forEach((point,index)=>{
    editorLayer.appendChild(createMarker(point,index));
  });
}

function updateMarkerPositions(){
  if(!editorMode)return;

  camera.updateMatrixWorld(true);
  rig.updateMatrixWorld(true);

  [...editorLayer.children].forEach((marker,index)=>{
    const point=editorPoints[index];
    if(!point)return;

    const world=uvToWorldPosition(point);
    const projected=world.clone().project(camera);
    const visible=projected.z>-1&&projected.z<1;

    marker.style.display=visible?"block":"none";
    if(!visible)return;

    marker.style.left=`${(projected.x*.5+.5)*window.innerWidth}px`;
    marker.style.top=`${(-projected.y*.5+.5)*window.innerHeight}px`;
  });
}

function screenToUV(clientX,clientY){
  if(!sphere)return null;
  const rect=renderer.domElement.getBoundingClientRect();
  pointer.x=((clientX-rect.left)/rect.width)*2-1;
  pointer.y=-((clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(pointer,camera);
  const hit=raycaster.intersectObject(sphere,false)[0];
  if(!hit||!hit.uv)return null;
  return {u:Number(hit.uv.x.toFixed(6)),v:Number(hit.uv.y.toFixed(6))};
}

function setHotspotFromScreen(index,clientX,clientY){
  const uv=screenToUV(clientX,clientY);
  if(!uv)return false;
  editorPoints[index]={scene:index,u:uv.u,v:uv.v};
  return true;
}

function enterEditor(){
  if(mode!=="gallery"){
    loadGallery().then(enterEditor);
    return;
  }
  editorMode=true;
  editorLayer.style.display="block";
  editorPanel.style.display="block";
  rebuildEditorMarkers();
  updateEditorInstruction();
}

function leaveEditor(){
  editorMode=false;
  draggedMarkerIndex=null;
  editorLayer.style.display="none";
  editorPanel.style.display="none";
}

function exportHotspots(){
  const content=JSON.stringify(editorPoints,null,2);
  const blob=new Blob([content],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;
  link.download="hotspots.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

editorUndo.addEventListener("click",()=>{
  editorPoints.pop();
  rebuildEditorMarkers();
  updateEditorInstruction();
});

editorSave.addEventListener("click",()=>{
  if(editorPoints.length!==SCENES.length){
    alert(`Il faut placer exactement ${SCENES.length} zones.`);
    return;
  }
  saveStoredHotspots();
  alert("Les liens sont enregistrés sur cet appareil.");
  leaveEditor();
});

editorExport.addEventListener("click",()=>{
  if(editorPoints.length!==SCENES.length){
    alert(`Il faut placer exactement ${SCENES.length} zones avant l’export.`);
    return;
  }
  saveStoredHotspots();
  exportHotspots();
});

editorClear.addEventListener("click",()=>{
  if(!confirm("Effacer les dix zones enregistrées ?"))return;
  editorPoints=[];
  localStorage.removeItem(HOTSPOT_STORAGE_KEY);
  rebuildEditorMarkers();
  updateEditorInstruction();
});

editorClose.addEventListener("click",leaveEditor);

window.addEventListener("keydown",event=>{
  if(event.key==="F2"){
    event.preventDefault();
    editorMode?leaveEditor():enterEditor();
  }
});

function circularDistance(a,b){
  const d=Math.abs(a-b);
  return Math.min(d,1-d);
}

function gallerySceneFromUV(uv){
  if(!uv||editorPoints.length!==SCENES.length)return null;

  let best=null;
  for(const hotspot of editorPoints){
    const du=circularDistance(uv.x,hotspot.u);
    const dv=Math.abs(uv.y-hotspot.v);
    const distance=Math.hypot(du,dv);
    if(!best||distance<best.distance){
      best={scene:hotspot.scene,distance};
    }
  }

  return best&&best.distance<HOTSPOT_RADIUS?best.scene:null;
}

function openGalleryArtworkAt(clientX,clientY){
  if(mode!=="gallery"||!sphere||editorMode)return false;
  const uv=screenToUV(clientX,clientY);
  if(!uv)return false;
  const sceneIndex=gallerySceneFromUV({x:uv.u,y:uv.v});
  if(sceneIndex===null)return false;
  loadScene(sceneIndex);
  return true;
}


function fail(message){errorBox.hidden=false;errorBox.textContent=message}
function dispose(){if(video){video.pause();video.removeAttribute("src");video.load();video=null}if(texture){texture.dispose();texture=null}if(sphere){scene.remove(sphere);sphere.material.dispose();sphere=null}}
function photo(file){return new Promise((ok,no)=>new THREE.TextureLoader().load(file,t=>{t.colorSpace=THREE.SRGBColorSpace;ok(t)},undefined,()=>no(new Error("Impossible de charger la photo : "+file))))}
function movie(file){return new Promise((ok,no)=>{const v=document.createElement("video");v.src=file;v.loop=true;v.muted=true;v.playsInline=true;v.preload="auto";v.addEventListener("canplay",async()=>{try{await v.play()}catch{}const t=new THREE.VideoTexture(v);t.colorSpace=THREE.SRGBColorSpace;t.minFilter=THREE.LinearFilter;t.magFilter=THREE.LinearFilter;video=v;ok(t)},{once:true});v.addEventListener("error",()=>no(new Error("Impossible de charger la vidéo : "+file)),{once:true});v.load()})}
async function loadConfig(cfg,newMode){if(loading)return;loading=true;prev.disabled=next.disabled=true;galleryBtn.disabled=newMode==="gallery";fade.style.opacity="1";await new Promise(r=>setTimeout(r,520));dispose();mode=newMode;yaw=THREE.MathUtils.degToRad(cfg.startYaw||0);pitch=0;title.textContent=cfg.title;document.title=cfg.title+" — Galerie 360";try{texture=cfg.type==="video"?await movie(cfg.file):await photo(cfg.file);sphere=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({map:texture}));scene.add(sphere)}catch(e){fail(e.message+"\n\nVérifie le nom exact du fichier dans le dossier media.")}finally{fade.style.opacity="0";loading=false;prev.disabled=false;next.disabled=false;galleryBtn.disabled=mode==="gallery"}}
async function loadScene(i){index=(i+SCENES.length)%SCENES.length;await loadConfig(SCENES[index],"artwork")}
async function loadGallery(){const a=mode==="artwork"?(SCENES[index].galleryYaw||0):0;await loadConfig({...GALLERY,startYaw:a},"gallery")}
function setQ(q,a,b,g,o){euler.set(b,a,-g,"YXZ");q.setFromEuler(euler);q.multiply(q1);q.multiply(q0.setFromAxisAngle(zee,-o))}
function updateCamera(){rig.rotation.set(pitch,yaw,0,"YXZ");if(!gyro||!orientation){camera.quaternion.identity();return}const a=orientation.alpha?THREE.MathUtils.degToRad(orientation.alpha):0,b=orientation.beta?THREE.MathUtils.degToRad(orientation.beta):0,g=orientation.gamma?THREE.MathUtils.degToRad(orientation.gamma):0,o=screenAngle?THREE.MathUtils.degToRad(screenAngle):0;setQ(camera.quaternion,a,b,g,o)}
function onOrientation(e){orientation=e}
function updateScreen(){screenAngle=screen.orientation?.angle??window.orientation??0}
async function enableGyro(){try{if(typeof DeviceOrientationEvent!=="undefined"&&typeof DeviceOrientationEvent.requestPermission==="function"){const p=await DeviceOrientationEvent.requestPermission();if(p!=="granted")throw new Error("L’autorisation du mouvement a été refusée.")}addEventListener("deviceorientation",onOrientation,true);gyro=true;gyroBtn.classList.add("active");gyroBtn.textContent="Gyroscope activé"}catch(e){gyro=false;gyroBtn.classList.remove("active");gyroBtn.textContent="Activer le gyroscope";alert(e.message||"Le gyroscope n’a pas pu être activé.")}}
function disableGyro(){gyro=false;orientation=null;removeEventListener("deviceorientation",onOrientation,true);camera.quaternion.identity();gyroBtn.classList.remove("active");gyroBtn.textContent="Activer le gyroscope"}
gyroBtn.addEventListener("click",()=>gyro?disableGyro():enableGyro());
prev.addEventListener("click",()=>{if(!editorMode)(mode==="gallery"?loadScene(SCENES.length-1):loadScene(index-1))});galleryBtn.addEventListener("click",()=>{if(!editorMode)loadGallery()});next.addEventListener("click",()=>{if(!editorMode)(mode==="gallery"?loadScene(0):loadScene(index+1))});
renderer.domElement.addEventListener("pointerdown",e=>{
  if(editorMode){
    pointerStartX=e.clientX;
    pointerStartY=e.clientY;
    pointerMoved=false;
    return;
  }
  down=true;
  px=e.clientX;
  py=e.clientY;
  pointerStartX=e.clientX;
  pointerStartY=e.clientY;
  pointerMoved=false;
  renderer.domElement.setPointerCapture(e.pointerId);
  if(video?.paused)video.play().catch(()=>{});
});

renderer.domElement.addEventListener("pointermove",e=>{
  if(editorMode){
    if(Math.hypot(e.clientX-pointerStartX,e.clientY-pointerStartY)>8)pointerMoved=true;
    return;
  }
  if(!down)return;
  const dx=e.clientX-px,dy=e.clientY-py;
  if(Math.hypot(e.clientX-pointerStartX,e.clientY-pointerStartY)>8)pointerMoved=true;
  px=e.clientX;
  py=e.clientY;
  yaw-=dx*.0045;
  pitch-=dy*.0045;
  pitch=THREE.MathUtils.clamp(pitch,-Math.PI/2.05,Math.PI/2.05);
});

renderer.domElement.addEventListener("pointerup",e=>{
  const wasClick=!pointerMoved&&Math.hypot(e.clientX-pointerStartX,e.clientY-pointerStartY)<=8;

  if(editorMode){
    if(
      wasClick &&
      draggedMarkerIndex===null &&
      editorPoints.length<SCENES.length
    ){
      const nextIndex=editorPoints.length;
      if(setHotspotFromScreen(nextIndex,e.clientX,e.clientY)){
        rebuildEditorMarkers();
        updateEditorInstruction();
      }
    }
    return;
  }

  down=false;
  try{renderer.domElement.releasePointerCapture(e.pointerId)}catch{}
  if(wasClick)openGalleryArtworkAt(e.clientX,e.clientY);
});

renderer.domElement.addEventListener("pointercancel",()=>{
  down=false;
  pointerMoved=false;
  draggedMarkerIndex=null;
});
renderer.domElement.addEventListener("wheel",e=>{camera.fov=THREE.MathUtils.clamp(camera.fov+e.deltaY*.035,35,100);camera.updateProjectionMatrix()},{passive:true});
renderer.domElement.addEventListener("touchstart",e=>{if(e.touches.length===2)pinch=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY)},{passive:true});
renderer.domElement.addEventListener("touchmove",e=>{if(e.touches.length===2){const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY),delta=pinch-d;pinch=d;camera.fov=THREE.MathUtils.clamp(camera.fov+delta*.08,35,100);camera.updateProjectionMatrix()}},{passive:true});
addEventListener("orientationchange",updateScreen);screen.orientation?.addEventListener?.("change",updateScreen);updateScreen();
addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
function animate(){requestAnimationFrame(animate);updateCamera();renderer.render(scene,camera);updateMarkerPositions()}animate();loadGallery();
