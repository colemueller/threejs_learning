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
    this._scene.fog = new THREE.FogExp2(0x89b2eb, 0.00075);

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

    this._sky = new Skybox({
      scene: this._scene,
    });

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(15, 16, 16),
      new THREE.MeshBasicMaterial()
    );
    sphere.castShadow = false;
    sphere.receiveShadow = false;
    sphere.position.set(450, 750, 450);
    this._sun = sphere;
    this._scene.add(sphere);

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

    this._orbitControls = new OrbitControls(this._camera, this._threejs.domElement);
    this._orbitControls.maxDistance = 125;
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

    this._sun.position.set(this._controls.Position.x + 450, 750, this._controls.Position.z + 450);
  }

  _LoadMountainsAndTrees(gui, controls, scene)
  {
    let _rocks;
    let _trees;
    let obj = new THREE.Object3D();

    let geo;

    const _params = {
      rockCount: 76,
      radius: 400,
      yValue: 0,
      treeCount: 64,
      treeArea: 350,
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
      geo.receiveShadow = true;
      geo.castShadow = true;

      const rockMat = new THREE.MeshLambertMaterial({color:0x362820,});

      _rocks = new THREE.InstancedMesh(geo, rockMat, _params.rockCount);
      _rocks.instanceMatrix.setUsage(THREE.StaticDrawUsage);
      scene.add(_rocks);

      //set rock transform data
      ArrangeRocks();
    });

    //TODO: find a lower poly tree model after adding grass in
    loader.load('Tree.fbx', function(fbx){
      fbx.traverse(c => {
        if(c.isMesh) geo = c.geometry;
      });
      geo.receiveShadow = true;
      geo.castShadow = true;

      const _tl = new THREE.TextureLoader();
      const leaves = _tl.load('../resources/nature/textures/DB2X2_L01.png');
      
      const barkMat = new THREE.MeshLambertMaterial({color: 0x5c3e15,});

      const leafMat = new THREE.MeshStandardMaterial();
      leafMat.map = leaves;
      //too expensive
      /* leafMat.alphaMap = leaves;
      leafMat.alphaTest = 0.1; */
      leafMat.transparent = true;

      _trees = new THREE.InstancedMesh(geo, [barkMat, leafMat], _params.treeCount);
      _trees.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(_trees);

      //set tree transform data
      ArrangeTrees();
    });

    function ArrangeRocks()
    {
      _rocks.count = _params.rockCount;
      const slice = 2 * Math.PI / _params.rockCount;
      const center = controls.Position;
      for(var i = 0; i < _params.rockCount; i++)
      {
        let angle = slice * i;
        let newX = center.x + _params.radius * Math.cos(angle);
        let newZ = center.z + _params.radius * Math.sin(angle);

        obj.position.set(newX, _params.yValue, newZ);
        let val = 50 + Math.random() * 50;
        obj.scale.set(val, val, val);
        obj.rotation.x = -Math.PI / 2;
        obj.rotateZ(Math.random() * (2 * Math.PI));

        obj.updateMatrix();

        _rocks.setMatrixAt(i, obj.matrix);
      }
      _rocks.instanceMatrix.needsUpdate = true;
    }

    function ArrangeTrees()
    {
      _trees.count = _params.treeCount;
      for(var i = 0; i < _params.treeCount; i++)
      {
        let randX = (Math.round(Math.random()) * 2 - 1) * (Math.random() * _params.treeArea);
        let randZ = (Math.round(Math.random()) * 2 - 1) * (Math.random() * _params.treeArea);

        obj.position.set(randX, 0, randZ);
        var val = 8 + Math.random() * 4.0;
        obj.scale.set(val, val, val);
        obj.rotation.set(0,0,0);
        obj.rotateY(Math.random() * (2 * Math.PI));

        obj.updateMatrix();

        _trees.setMatrixAt(i, obj.matrix);
      }
      _trees.instanceMatrix.needsUpdate = true;
    }
  }
}


let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
  _APP = new BasicWorldDemo();
});
