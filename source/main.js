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
      new THREE.MeshStandardMaterial()
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
    let count = 0;
    const manager = new THREE.LoadingManager();
    manager.onLoad = _OnLoad;
    let object;

    const _models = [];
    const _rocks = [];
    const _trees = [];
    const loader = new FBXLoader(manager);
    loader.setPath('../resources/nature/');
    loader.load('Rock_1.fbx', function(fbx){object = fbx;});

    const rock_params = {
      points: 46,
      radius: 400,
      yValue: -20,
      treeNumber: 64,
      treeArea: 350,
    };
    
    /* const folder = gui.addFolder( 'Mountain Spawn' );
    folder.add(rock_params, 'treeNumber', 0, 500).step(1).onChange(AddTrees);
    folder.add(rock_params, 'treeArea', 0, 500).onChange(AddTrees);
    folder.add(rock_params, 'points', 8, 128 ).step(2).onChange(DrawCirclePoints);
    folder.add(rock_params, 'radius', 60, 500 ).onChange(DrawCirclePoints);
    folder.add(rock_params, 'yValue', -100, 100 ).onChange(DrawCirclePoints); */

    //random rock, place in circle around character
    function DrawCirclePoints()
    {
      let points = rock_params.points;
      let radius = rock_params.radius;
      let yValue = rock_params.yValue;
      let center = controls.Position;

      const slice = 2 * Math.PI / points;
      for(var i = 0; i < points; i++)
      {
        let rand = Math.round(Math.random() * 4);
        let _mesh;
        if(!_rocks[i]) _mesh = _models[rand].clone();
        else _mesh = _rocks[i];
        _mesh.frustumCulled = true;

        let angle = slice * i;
        let newX = center.x + radius * Math.cos(angle);
        let newZ = center.z + radius * Math.sin(angle);

        _mesh.position.set(newX, yValue, newZ);
        
        _rocks[i] = _mesh;
        scene.add(_mesh);
      }
      AddTrees();
    }

    function AddTrees()
    {
      for(var i = 0; i < rock_params.treeNumber; i++)
      {
        let _mesh;
        if(!_trees[i]) _mesh = _models[5].clone();
        else continue;
        _mesh.frustumCulled = true;

        let randX = (Math.round(Math.random()) * 2 - 1) * (Math.random() * rock_params.treeArea);
        let randZ = (Math.round(Math.random()) * 2 - 1) * (Math.random() * rock_params.treeArea);

        _mesh.position.set(randX, 0, randZ);
        _mesh.scale.set(8 + Math.random() * 4.0, 8 + Math.random() * 4.0, 8 + Math.random() * 4.0);

        _trees[i] = _mesh;
        scene.add(_mesh);
      }
    }

    function _OnLoad()
    {
      count++;

      object.traverse(c => {
          c.castShadow = true;
          c.receiveShadow = true;
          c.material = new THREE.MeshLambertMaterial({color: 0x4a4a4a,});
      });

      //trees
      if(count >= 6)
      {
        const _tl = new THREE.TextureLoader();
        const leaves = _tl.load('../resources/nature/textures/DB2X2_L01.png');

        object.scale.setScalar(10);
        object.traverse(d => {
          const barkMat = new THREE.MeshLambertMaterial({color: 0x5c3e15,});

          const leafMat = new THREE.MeshStandardMaterial();
          leafMat.blending = THREE.NormalBlending;
          leafMat.map = leaves;
          //too expensive
          /* leafMat.alphaMap = leaves;
          leafMat.alphaTest = 0.1; */
          leafMat.transparent = true;

          d.material = [barkMat, leafMat];
        });
        
      }

      _models.push(object);
      
      switch(count)
      {
        case 1:
          loader.load('Rock_2.fbx', function(fbx){object = fbx;});
          break;
        case 2:
          loader.load('Rock_3.fbx', function(fbx){object = fbx;});
          break;
        case 3:
          loader.load('Rock_4.fbx', function(fbx){object = fbx;});
          break;
        case 4:
          loader.load('Rock_5.fbx', function(fbx){object = fbx;});
          break;
        case 5:
          loader.load('Tree.fbx', function(fbx){object = fbx;});
          break;
        default:
          break;
      }

      if(count == 6) DrawCirclePoints();
    }
  }
}


let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
  _APP = new BasicWorldDemo();
});
