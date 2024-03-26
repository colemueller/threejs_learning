import * as THREE from 'three';
import { Lensflare, LensflareElement } from './Lensflare.js';

const _VS = `
varying vec3 vWorldPosition;

void main() {
  vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
  vWorldPosition = worldPosition.xyz;

  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;


const _FS = `
uniform vec3 topColor;
uniform vec3 bottomColor;
uniform float offset;
uniform float exponent;

varying vec3 vWorldPosition;

void main() {
  float h = normalize( vWorldPosition + offset ).y;
  gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( max( h , 0.0), exponent ), 0.0 ) ), 1.0 );
}`;

export class Skybox
{
    constructor(params)
    {
        this._params = params;
        
        this._LoadSky();
        window.addEventListener( 'resize', this.onWindowResize );
    }

    _LoadSky() 
    {
        const hemiLight = new THREE.HemisphereLight(0xFFFFFF, 0xFFFFFFF, 0.6);
        hemiLight.color.setHSL(0.6, 1, 0.6);
        hemiLight.groundColor.setHSL(0.095, 1, 0.75);
        this._params.scene.add(hemiLight);

        const uniforms = {
            "topColor": { value: new THREE.Color(0x0077ff) },
            "bottomColor": { value: new THREE.Color(0xffffff) },
            "offset": { value: 33 },
            "exponent": { value: 0.6 }
        };
        uniforms["topColor"].value.copy(hemiLight.color);

        this._params.scene.fog.color.copy(uniforms["bottomColor"].value);

        const skyGeo = new THREE.SphereGeometry(1000, 32, 15);
        const skyMat = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: _VS,
            fragmentShader: _FS,
            side: THREE.BackSide,
            depthWrite: false,
        });

        const sky = new THREE.Mesh(skyGeo, skyMat);
        this._params.scene.add(sky);

        const loader = new THREE.TextureLoader();
        const corona = loader.load('../resources/flares/corona.png');
        const flare = loader.load('../resources/flares/flare.png');

        const light = new THREE.PointLight( 0xffffff, 1.5, 0, 0 );
        light.position.set(450, 750, 450);
        light.castShadow = false;
        light.frustumCulled = false;
        this._params.scene.add(light);
        this._sun = light;

        const lensflare = new Lensflare();
        lensflare.frustumCulled = false;
        lensflare.addElement(new LensflareElement(corona, 150, 0, light.color));
        lensflare.addElement(new LensflareElement(flare, 60, 0.6));
        lensflare.addElement(new LensflareElement(flare, 70, 0.7));
        lensflare.addElement(new LensflareElement(flare, 120, 0.9));
        lensflare.addElement(new LensflareElement(flare, 70, 1));
        light.add(lensflare);
    }

    Update()
    {
        this._sun.position.set(this._params.controls.Position.x + 450, 750, this._params.controls.Position.z + 450);
    }
}