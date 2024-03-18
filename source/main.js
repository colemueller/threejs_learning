import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {CharacterController} from './CharacterController.js'
import {ThirdPersonCamera} from './ThirdPersonCamera.js';
import { Skybox } from './Sky.js';
import Stats from 'https://cdnjs.cloudflare.com/ajax/libs/stats.js/17/Stats.js'


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
    this._scene.fog = new THREE.FogExp2(0x89b2eb, 0.002);

    let light = new THREE.DirectionalLight(0xFFFFFF, 2.5);
    light.position.set(20, 100, 20);
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

    this._sun = light;
    this._scene.add(light);

    light = new THREE.AmbientLight(0xFFFFFF, .5);
    this._scene.add(light);

    this._sky = new Skybox({
      scene: this._scene,
    });

    /* const loader = new THREE.CubeTextureLoader();
    const texture = loader.load([
        './resources/posx.jpg',
        './resources/negx.jpg',
        './resources/posy.jpg',
        './resources/negy.jpg',
        './resources/posz.jpg',
        './resources/negz.jpg',
    ]);
    this._scene.background = texture; */

    const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(1000, 1000, 250, 250),
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

    this._thirdPersonCamera = new ThirdPersonCamera({
      camera: this._camera,
      target: this._controls,
    });

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

    this._thirdPersonCamera.Update(timeElapsedS);
  }
}


let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
  _APP = new BasicWorldDemo();
});
