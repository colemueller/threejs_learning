import * as THREE from 'three';

class InstancedFloat16BufferAttribute extends THREE.InstancedBufferAttribute {

	constructor( array, itemSize, normalized, meshPerAttribute = 1 ) {

		super( new Uint16Array( array ), itemSize, normalized, meshPerAttribute );

		this.isFloat16BufferAttribute = true;
	}
};

const NUM_GRASS = (32 * 32) * 3;
const GRASS_SEGMENTS_LOW = 1;
const GRASS_SEGMENTS_HIGH = 6;
const GRASS_VERTICES_LOW = (GRASS_SEGMENTS_LOW + 1) * 2;
const GRASS_VERTICES_HIGH = (GRASS_SEGMENTS_HIGH + 1) * 2;
const GRASS_LOD_DIST = 15;
const GRASS_MAX_DIST = 100;

const GRASS_PATCH_SIZE = 5 * 2;

const GRASS_WIDTH = 0.1;
const GRASS_HEIGHT = 1.5;

export class Grass
{
    constructor(params)
    {
        this._scene = params.scene;
        this._camera = params.camera;

        this._meshesLow = [];
        this._meshesHigh = [];
        this._group = new THREE.Group();
        this._group.name = "GRASS";
        this._totalTime = 0;
        this._grassMaterialLow = new THREE.MeshPhongMaterial({color: 0xb00020});
        this._grassMaterialHigh = new THREE.MeshPhongMaterial({color: 0x469114});
        this._geometryLow = null;
        this._geometryHigh = null;

        this.Init();
    }

    Init() {
       
        this._grassMaterialLow.side = THREE.FrontSide;
        this._grassMaterialHigh.side = THREE.FrontSide;
    
        this._geometryLow = this.CreateGeometry(GRASS_SEGMENTS_LOW);
        this._geometryHigh = this.CreateGeometry(GRASS_SEGMENTS_HIGH);
    
        this._scene.add(this._group);
        this.CreateMesh(new THREE.Vector3(20,0,20));
      }

    CreateGeometry(segments) 
    {
        const VERTICES = (segments + 1) * 2;

        const indices = [];
        for (let i = 0; i < segments; ++i) {
            const vi = i * 2;
            indices[i*12+0] = vi + 0;
            indices[i*12+1] = vi + 1;
            indices[i*12+2] = vi + 2;

            indices[i*12+3] = vi + 2;
            indices[i*12+4] = vi + 1;
            indices[i*12+5] = vi + 3;

            const fi = VERTICES + vi;
            indices[i*12+6] = fi + 2;
            indices[i*12+7] = fi + 1;
            indices[i*12+8] = fi + 0;

            indices[i*12+9]  = fi + 3;
            indices[i*12+10] = fi + 1;
            indices[i*12+11] = fi + 2;
        }

        const offsets = [];
        for (let i = 0; i < NUM_GRASS; ++i) {
            offsets.push(Math.random * ((GRASS_PATCH_SIZE * 0.5) - (-GRASS_PATCH_SIZE * 0.5)) + (-GRASS_PATCH_SIZE * 0.5));
            offsets.push(Math.random * ((GRASS_PATCH_SIZE * 0.5) - (-GRASS_PATCH_SIZE * 0.5)) + (-GRASS_PATCH_SIZE * 0.5));
            offsets.push(0);
        }
        //RNG_.random() * (b - a) + a;

        const offsetsData = offsets.map(THREE.DataUtils.toHalfFloat);

        const vertID = new Uint8Array(VERTICES*2);
        for (let i = 0; i < VERTICES*2; ++i) {
            vertID[i] = i;
        }

        const geo = new THREE.InstancedBufferGeometry();
        geo.instanceCount = NUM_GRASS;
        geo.setAttribute('vertIndex', new THREE.Uint8BufferAttribute(vertID, 1));
        geo.setAttribute('position', new InstancedFloat16BufferAttribute(offsetsData, 3));
        geo.setIndex(indices);
        geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1 + GRASS_PATCH_SIZE * 2);

        return geo;
    }

    CreateMesh(spawnPosition) 
    {
        const distToCell = this._camera.position.distanceTo(spawnPosition);
        const meshes = distToCell > GRASS_LOD_DIST ? this._meshesLow : this._meshesHigh;
        if (meshes.length > 1000) {
          console.log('crap')
          return null;
        }
    
        const geo = distToCell > GRASS_LOD_DIST ? this._geometryLow : this._geometryHigh;
        const mat = distToCell > GRASS_LOD_DIST ? this._grassMaterialLow : this._grassMaterialHigh;
    
        const m = new THREE.Mesh(geo, mat);
        m.position.set(0, 0, 0);
        m.receiveShadow = true;
        m.castShadow = false;
        m.visible = false;
    
        meshes.push(m);
        this._group.add(m);
        return m;
      }
}