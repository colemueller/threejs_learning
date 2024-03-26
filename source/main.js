import * as THREE from 'three';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js'
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {CharacterController} from './CharacterController.js'
import {ThirdPersonCamera} from './ThirdPersonCamera.js';
import { Skybox } from './Sky.js';
import Stats from 'https://cdnjs.cloudflare.com/ajax/libs/stats.js/17/Stats.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';


class BasicWorldDemo 
{
  constructor()
  {
    this._Initialize();
  }

  _Initialize() 
  {
    this.M_TMP = new THREE.Matrix4();
    this._instancedMeshes = {}

    this._threejs = new THREE.WebGLRenderer({
      antialias: true,
    });
    this._threejs.shadowMap.enabled = true;
    this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
    this._threejs.setPixelRatio(window.devicePixelRatio);
    this._threejs.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(this._threejs.domElement);
    this.stats = new Stats();
    this.stats.showPanel(0);
    document.body.appendChild(this.stats.dom);

    window.addEventListener('resize', () => {
      this._OnWindowResize();
    }, false);

    const fov = 60;
    const aspect = 1920 / 1080;
    const near = 1.0;
    const far = 1500.0;
    this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this._camera.position.set(25, 10, 25);

    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0xFF00FF);
    this._scene.fog = new THREE.FogExp2(0x89b2eb, 0.0015); //0.00075

    let light = new THREE.DirectionalLight(0xFFFFFF, 2.5);
    light.position.set(50, 100, 50);
    light.target.position.set(0, 0, 0);
    light.castShadow = true;
    light.shadow.bias = -0.001;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 500.0;
    light.shadow.camera.left = 500;
    light.shadow.camera.right = -500;
    light.shadow.camera.top = 500;
    light.shadow.camera.bottom = -500;

    light.shadow.mapSize.width = 8096;
    light.shadow.mapSize.height = 8096;

    this._scene.add(light);

    light = new THREE.AmbientLight(0xFFFFFF, .5);
    this._scene.add(light);
    
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(800, 800, 250, 250),
      new THREE.MeshStandardMaterial({
          color: 0xB3E260,
        }));
    plane.castShadow = false;
    plane.receiveShadow = true;
    plane.rotation.x = -Math.PI / 2;
    this._scene.add(plane);

    this._mixers = [];
    this._previousRAF = null;

    //load input + character controller
    this._controls = new CharacterController({
      camera: this._camera,
      scene: this._scene,
    });

    this._sky = new Skybox({
      scene: this._scene,
      camera: this._camera,
      controls: this._controls,
    });

    this._orbitControls = new OrbitControls(this._camera, this._threejs.domElement);
    this._orbitControls.maxDistance = 125;
    this._orbitControls.rotateSpeed = 0.5;
    this._orbitControls.enableDamping = true;
    this._orbitControls.enabled = false;

    this._thirdPersonCamera = new ThirdPersonCamera({
      camera: this._camera,
      target: this._controls,
    });

    //camera gui
    const gui = new GUI();
    this.gui_params = {
      Cole_Mueller: 'cole-mueller.com',
      move: 'wasd',
      jump: 'space',
      emote: 'f',
      switch: false,
    };
    
    gui.add(this.gui_params, 'Cole_Mueller' ).disable();
    gui.add(this.gui_params, 'move' ).disable();
    gui.add(this.gui_params, 'jump' ).disable();
    gui.add(this.gui_params, 'emote' ).disable();
    gui.add(this.gui_params, 'switch').name("Use Orbit Camera");

    this._LoadMountainsAndTrees(gui, this._controls, this._scene);

    this._OnWindowResize();
    this._RAF();
  }

  _OnWindowResize() 
  {
    this._camera.aspect = window.innerWidth / window.innerHeight;
    this._camera.updateProjectionMatrix();
    this._threejs.setSize(window.innerWidth, window.innerHeight);
  }

  _RAF() 
  {
    this.stats.begin();
    requestAnimationFrame((t) => {
      if (this._previousRAF === null) 
      {
        this._previousRAF = t;
      }

      this._RAF();

      this._threejs.render(this._scene, this._camera);
      this._Step(t - this._previousRAF);
      this._previousRAF = t;
    });

    this.stats.end();
  }

  _Step(timeElapsed) 
  {
    const timeElapsedS = timeElapsed * 0.001;
    if (this._mixers) 
    {
      this._mixers.map(m => m.update(timeElapsedS));
    }

    if (this._controls) 
    {
      this._controls.Update(timeElapsedS);
    }

    this._orbitControls.enabled = this.gui_params.switch;
    if(this.gui_params.switch)
    {
      
      this._orbitControls.target.set(this._controls.Position.x, this._controls.Position.y + 16.7, this._controls.Position.z);
      this._orbitControls.update();
    }
    else
    {
      this._thirdPersonCamera.Update(timeElapsedS);
    }
    this._sky.Update(timeElapsedS);

    this._FrustumCullInstancedMeshes();

  }

  _FrustumCullInstancedMeshes()
  {
    let culledCount = 0;
    let totalMeshes = 0;
    const frustum = new THREE.Frustum().setFromProjectionMatrix(this.M_TMP.copy(this._camera.projectionMatrix).multiply(this._camera.matrixWorldInverse));

    //inside loop of every instanced mesh cell
    for(var i = 0; i < Object.keys(this._instancedMeshes).length; i++)
    {
      totalMeshes++;

      let currentMesh = this._scene.getObjectById(this._instancedMeshes[i]);

      //create bounding box around cell
      const boundingBox= new THREE.Box3().setFromObject(currentMesh);

      if (!frustum.intersectsBox(boundingBox)) 
      {
        culledCount++;
        currentMesh.visible = false;
        continue;
      }
      currentMesh.visible = true;
    }
    /* console.log("total instanced objects: " + totalMeshes);
    console.log("culled objects: " + culledCount + ". Shown objects: " + (totalMeshes - culledCount)); */
  }

  _LoadMountainsAndTrees(gui, controls, scene)
  {
    let _rock;
    let _tree;
    let obj = new THREE.Object3D();
    let rockMat;
    let barkMat;
    let leafMat;
    let geo;

    const _meshes = {};

    const _params = {
      rockCount: 46, //change back to 76 
      radius: 425,
      yValue: -5,
      treeCount: 28, //orig 64
      treeArea: 300,
    };

    //const folder = gui.addFolder( 'Environment Models' );
    /* folder.add(_params, 'rockCount', 8, 76 ).step(2).onChange(ArrangeRocks);
    folder.add(_params, 'radius', 60, 500 ).onChange(ArrangeRocks);
    folder.add(_params, 'yValue', -100, 100 ).onChange(ArrangeRocks); */
    /* folder.add(_params, 'treeCount', 0, 64).step(1).onChange(ArrangeTrees);
    folder.add(_params, 'treeArea', 0, 500).onChange(ArrangeTrees); */

    const loader = new FBXLoader();
    loader.setPath('../resources/nature/');
    loader.load('Rock_2.fbx', function(fbx){
      fbx.traverse(c => {
        if(c.isMesh) geo = c.geometry;
      });
      geo.computeBoundingBox();

      rockMat = new THREE.MeshLambertMaterial({color:0x362820,});
      
      _rock = new THREE.InstancedBufferGeometry().copy(geo);
      _rock.instanceCount = 1;

      //set rock transform data
      ArrangeRocks();
    });

    //TODO: find a lower poly tree model after adding grass in
    loader.load('Tree.fbx', function(fbx){
      fbx.traverse(c => {
        if(c.isMesh) geo = c.geometry;
      });
      geo.computeBoundingBox();

      const _tl = new THREE.TextureLoader();
      const leaves = _tl.load('../resources/nature/textures/DB2X2_L01.png');
      
      barkMat = new THREE.MeshLambertMaterial({color: 0x5c3e15,});

      leafMat = new THREE.MeshStandardMaterial();
      leafMat.map = leaves;
      //too expensive
      leafMat.alphaMap = leaves;
      leafMat.alphaTest = 0.1;
      leafMat.transparent = false;

      _tree = new THREE.InstancedBufferGeometry().copy(geo);
      _tree.instanceCount = 1;

      //set tree transform data
      ArrangeTrees();
    });

    this._instancedMeshes = _meshes;

    function ArrangeRocks()
    {
      const slice = 2 * Math.PI / _params.rockCount;
      const center = controls.Position;
      for(var i = 0; i < _params.rockCount; i++)
      {
        let angle = slice * i;
        let newX = center.x + _params.radius * Math.cos(angle);
        let newZ = center.z + _params.radius * Math.sin(angle);

        obj.position.set(newX, _params.yValue, newZ);
        let val = 85 + Math.random() * 25;
        obj.scale.set(val, val, val);
        obj.rotation.x = -Math.PI / 2;
        obj.rotateZ(Math.random() * (2 * Math.PI));

        obj.updateMatrix();

        const mesh = new THREE.Mesh(_rock, rockMat);
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.applyMatrix4(obj.matrix);
        mesh.visible = false;

        _meshes[Object.keys(_meshes).length] = mesh.id;

        scene.add(mesh);
      }
    }

    function ArrangeTrees()
    {
      obj.position.set(0,0,0);
      obj.rotation.set(0,0,0);
      obj.scale.set(1,1,1);
      obj.updateMatrix();

      for(var i = 0; i < _params.treeCount; i++)
      {
        let randX = (Math.round(Math.random()) * 2 - 1) * (Math.random() * _params.treeArea);
        let randZ = (Math.round(Math.random()) * 2 - 1) * (Math.random() * _params.treeArea);

        obj.position.set(randX, 0, randZ);
        var val = 8 + Math.random() * 5.0;
        obj.scale.set(val, val, val);
        obj.rotateY(Math.random() * (2 * Math.PI));

        obj.updateMatrix();

        const mesh = new THREE.Mesh(_tree, [barkMat, leafMat]);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.applyMatrix4(obj.matrix);
        mesh.visible = false;
        
        _meshes[Object.keys(_meshes).length] = mesh.id;

        scene.add(mesh);
      }
    }
  }
}


let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
  _APP = new BasicWorldDemo();
});
