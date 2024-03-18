import * as THREE from 'three';

export class ThirdPersonCamera
{
    constructor(params)
    {
        this._params = params;
        this._camera = params.camera;

        this._currentPosition = new THREE.Vector3();
        this._currentLookAt = new THREE.Vector3();
    }

    _CalculateIdealOffset()
    {
        const _offset = new THREE.Vector3(0, 22.5, -25);
        _offset.applyQuaternion(this._params.target.Rotation);
        _offset.add(this._params.target.Position);
        return _offset;
    }

    _CalculateIdealLookAt()
    {
        const _lookAt = new THREE.Vector3(0, 5, 50);
        _lookAt.applyQuaternion(this._params.target.Rotation);
        _lookAt.add(this._params.target.Position);
        return _lookAt;
    }

    Update(timeElapsed)
    {
        const idealOffset = this._CalculateIdealOffset();
        const idealLookat = this._CalculateIdealLookAt();

        const damp = 0.975;
        const t = damp - Math.pow(0.001, timeElapsed);

        this._currentPosition.lerp(idealOffset, t);
        this._currentLookAt.lerp(idealLookat, t);

        this._camera.position.copy(this._currentPosition);
        this._camera.lookAt(this._currentLookAt);
    }
};