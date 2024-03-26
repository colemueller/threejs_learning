import {FBXLoader} from 'three/addons/loaders/FBXLoader.js'
import * as THREE from 'three';

class CharacterControllerProxy 
{
    constructor(animations) 
    {
        this._animations = animations;
    }

    get animations() 
    {
        return this._animations;
    }
};
  
  
export class CharacterController 
{
    constructor(params) 
    {
        this._Init(params);
    }

    _Init(params) 
    {
        this._params = params;
        this._decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
        this._acceleration = new THREE.Vector3(1, 0.25, 50.0);
        this._velocity = new THREE.Vector3(0, 0, 0);
        this._position = new THREE.Vector3();

        this._animations = {};
        this._input = new CharacterControllerInput();
        this._stateMachine = new CharacterFSM(new CharacterControllerProxy(this._animations));

        this._origin = new THREE.Vector3(0,0,0);

        this._LoadModels();
    }

    _LoadModels() 
    {
        const loader = new FBXLoader();
        loader.setPath('../resources/ninja/');
        loader.load('ninja.fbx', (fbx) => {
            fbx.scale.setScalar(0.1);
            fbx.traverse(c => {
                c.castShadow = true;
            });

            this._target = fbx;
            this._params.scene.add(this._target);

            this._mixer = new THREE.AnimationMixer(this._target);

            this._manager = new THREE.LoadingManager();
            this._manager.onLoad = () => {
                this._stateMachine.SetState('idle');
            };

            const _OnLoad = (animName, anim) => {
                const clip = anim.animations[0];
                const action = this._mixer.clipAction(clip);

                this._animations[animName] = {
                    clip: clip,
                    action: action,
                };
            };

            const loader = new FBXLoader(this._manager);
            loader.setPath('../resources/ninja/');
            loader.load('walk.fbx', (a) => { _OnLoad('walk', a); });
            loader.load('backward.fbx', (a) => { _OnLoad('backward', a); });
            loader.load('run.fbx', (a) => { _OnLoad('run', a); });
            loader.load('idle.fbx', (a) => { _OnLoad('idle', a); });
            loader.load('dance.fbx', (a) => { _OnLoad('dance', a); });
            loader.load('rightTurn.fbx', (a) => { _OnLoad('rightTurn', a); });
            loader.load('leftTurn.fbx', (a) => { _OnLoad('leftTurn', a); });
            loader.load('jump.fbx', (a) => { _OnLoad('jump', a); });
        });
    }

    get Position() 
    {
        return this._position;
    }
    
    get Rotation() 
    {
        if (!this._target) 
        {
            return new THREE.Quaternion();
        }
        return this._target.quaternion;
    }

    Update(timeInSeconds) 
    {
        if (!this._target) 
        {
            return;
        }

        this._stateMachine.Update(timeInSeconds, this._input);

        const velocity = this._velocity;
        const frameDecceleration = new THREE.Vector3(
            velocity.x * this._decceleration.x,
            velocity.y * this._decceleration.y,
            velocity.z * this._decceleration.z
        );
        frameDecceleration.multiplyScalar(timeInSeconds);
        frameDecceleration.z = Math.sign(frameDecceleration.z) * Math.min(Math.abs(frameDecceleration.z), Math.abs(velocity.z));

        velocity.add(frameDecceleration);

        const controlObject = this._target;
        const _Q = new THREE.Quaternion();
        const _A = new THREE.Vector3();
        const _R = controlObject.quaternion.clone();

        const acc = this._acceleration.clone();
        if (this._input._keys.shift && this._stateMachine._currentState.Name != 'backward') 
        {
            acc.multiplyScalar(2.5);
        }

        if (this._input._keys.forward) 
        {
            acc.multiplyScalar(1.75);
            velocity.z += acc.z * timeInSeconds;
        }
        if (this._input._keys.backward) 
        {
            velocity.z -= acc.z * timeInSeconds;
        }
        
        if(this._stateMachine._currentState == null) return;
        if (this._stateMachine._currentState.Name == 'dance' || this._stateMachine._currentState.Name == 'leftTurn' || this._stateMachine._currentState.Name == 'rightTurn') 
        {
            acc.multiplyScalar(0.0);
        }

        const _turnSpeed = 1.25;
        if (this._input._keys.left) 
        {
            _A.set(0, 1, 0);
            _Q.setFromAxisAngle(_A, _turnSpeed * Math.PI * timeInSeconds * this._acceleration.y);
            _R.multiply(_Q);
        }
        if (this._input._keys.right) 
        {
            _A.set(0, 1, 0);
            _Q.setFromAxisAngle(_A, _turnSpeed * -Math.PI * timeInSeconds * this._acceleration.y);
            _R.multiply(_Q);
        }

        controlObject.quaternion.copy(_R);

        const oldPosition = new THREE.Vector3();
        oldPosition.copy(controlObject.position);

        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(controlObject.quaternion);
        forward.normalize();

        const sideways = new THREE.Vector3(1, 0, 0);
        sideways.applyQuaternion(controlObject.quaternion);
        sideways.normalize();

        sideways.multiplyScalar(velocity.x * timeInSeconds);
        forward.multiplyScalar(velocity.z * timeInSeconds);

        controlObject.position.add(forward);
        controlObject.position.add(sideways);

        const bounds = 350;
        if(controlObject.position.distanceTo(this._origin) >= bounds)
        {
            controlObject.position.set(controlObject.position.normalize().x * bounds, 0, controlObject.position.normalize().z * bounds);
        }

        this._position.copy(controlObject.position);

        if (this._mixer) 
        {
            this._mixer.update(timeInSeconds);
        }
    }
};
  
class CharacterControllerInput 
{
    constructor() 
    {
        this._Init();    
    }

    _Init() 
    {
        this._keys = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        space: false,
        shift: false,
        dance: false,
        };
        document.addEventListener('keydown', (e) => this._onKeyDown(e), false);
        document.addEventListener('keyup', (e) => this._onKeyUp(e), false);
    }

    _onKeyDown(event) 
    {
        switch (event.keyCode) 
        {
            case 87: // w
                this._keys.forward = true;
                break;
            case 65: // a
                this._keys.left = true;
                break;
            case 83: // s
                this._keys.backward = true;
                break;
            case 68: // d
                this._keys.right = true;
                break;
            case 32: // SPACE
                this._keys.space = true;
                break;
            case 16: // SHIFT
                this._keys.shift = true;
                break;
            case 70: //F
                this._keys.dance = true;
                break;
        }
    }

    _onKeyUp(event) 
    {
        switch(event.keyCode) 
        {
            case 87: // w
                this._keys.forward = false;
                break;
            case 65: // a
                this._keys.left = false;
                break;
            case 83: // s
                this._keys.backward = false;
                break;
            case 68: // d
                this._keys.right = false;
                break;
            case 32: // SPACE
                this._keys.space = false;
                break;
            case 16: // SHIFT
                this._keys.shift = false;
                break;
            case 70: //F
                this._keys.dance = false;
                break;
        }
    }
};
  
  
class FiniteStateMachine 
{
    constructor() 
    {
        this._states = {};
        this._currentState = null;
    }

    _AddState(name, type) 
    {
        this._states[name] = type;
    }

    SetState(name) 
    {
        //console.log("change state to " + name);
        const prevState = this._currentState;
        
        if (prevState) 
        {
            if (prevState.Name == name) 
            {
                return;
            }
            prevState.Exit();
        }

        const state = new this._states[name](this);

        this._currentState = state;
        state.Enter(prevState);
    }

    Update(timeElapsed, input) 
    {
        if (this._currentState) 
        {
            this._currentState.Update(timeElapsed, input);
        }
    }
};


class CharacterFSM extends FiniteStateMachine {
    constructor(proxy) 
    {
        super();
        this._proxy = proxy;
        this._Init();
    }

    _Init() 
    {
        this._AddState('idle', IdleState);
        this._AddState('walk', WalkState);
        this._AddState('backward', BackwardState);
        this._AddState('run', RunState);
        this._AddState('jump', JumpState);
        this._AddState('leftTurn', LeftTurnState);
        this._AddState('rightTurn', RightTurnState);
        this._AddState('dance', DanceState);
    }
};


class State 
{
    constructor(parent) 
    {
        this._parent = parent;
    }

    Enter() {}
    Exit() {}
    Update() {}
};

class LeftTurnState extends State 
{
    constructor(parent) 
    {
        super(parent);
    }

    get Name() 
    {
        return 'leftTurn';
    }

    Enter(prevState) 
    {
        const curAction = this._parent._proxy._animations['leftTurn'].action;
        if (prevState) 
        {
            const prevAction = this._parent._proxy._animations[prevState.Name].action;

            curAction.enabled = true;

            curAction.time = 0.0;
            curAction.setEffectiveTimeScale(1.0);
            curAction.setEffectiveWeight(1.0);

            curAction.crossFadeFrom(prevAction, 0.5, true);
            curAction.play();
        } 
        else 
        {
            curAction.play();
        }
    }

    Exit() {}

    Update(timeElapsed, input)
    {
        if(input._keys.left) return;

        this._parent.SetState('idle');
    }
};

class RightTurnState extends State 
{
    constructor(parent) 
    {
        super(parent);
    }

    get Name() 
    {
        return 'rightTurn';
    }

    Enter(prevState) 
    {
        const curAction = this._parent._proxy._animations['rightTurn'].action;
        if (prevState) 
        {
            const prevAction = this._parent._proxy._animations[prevState.Name].action;

            curAction.enabled = true;

            curAction.time = 0.0;
            curAction.setEffectiveTimeScale(1.0);
            curAction.setEffectiveWeight(1.0);

            curAction.crossFadeFrom(prevAction, 0.5, true);
            curAction.play();
        } 
        else 
        {
            curAction.play();
        }
    }

    Exit() {}

    Update(timeElapsed, input)
    {
        if(input._keys.right) return;

        this._parent.SetState('idle');
    }
};
  
class DanceState extends State 
{
    constructor(parent) 
    {
        super(parent);

        this._FinishedCallback = () => {
            this._Finished();
        }
    }

    get Name() 
    {
        return 'dance';
    }

    Enter(prevState) 
    {
        const curAction = this._parent._proxy._animations['dance'].action;
        const mixer = curAction.getMixer();
        mixer.addEventListener('finished', this._FinishedCallback);

        if (prevState) 
        {
            const prevAction = this._parent._proxy._animations[prevState.Name].action;

            curAction.reset();  
            curAction.setLoop(THREE.LoopOnce, 1);
            curAction.clampWhenFinished = true;
            curAction.crossFadeFrom(prevAction, 0.2, true);
            curAction.play();
        } 
        else 
        {
            curAction.play();
        }
    }

    _Finished() 
    {
        this._Cleanup();
        this._parent.SetState('idle');
    }

    _Cleanup() 
    {
        const action = this._parent._proxy._animations['dance'].action;
        
        action.getMixer().removeEventListener('finished', this._CleanupCallback);
    }

    Exit() 
    {
        this._Cleanup();
    }

    Update(_) {}
};

class JumpState extends State 
{
    constructor(parent) 
    {
        super(parent);

        this._FinishedCallback = () => {
            this._Finished();
        }
    }

    get Name() 
    {
        return 'jump';
    }

    Enter(prevState) 
    {
        const curAction = this._parent._proxy._animations['jump'].action;
        const mixer = curAction.getMixer();
        mixer.addEventListener('finished', this._FinishedCallback);
        this._p = prevState;
        if (prevState) 
        {
            const prevAction = this._parent._proxy._animations[prevState.Name].action;

            curAction.reset();  
            curAction.setLoop(THREE.LoopOnce, 1);
            curAction.clampWhenFinished = true;
            curAction.crossFadeFrom(prevAction, 0.2, true);
            curAction.play();
        } 
        else 
        {
            curAction.play();
        }
    }

    _Finished() 
    {
        this._Cleanup();
        if(this._i._keys.forward)
        {
            if (this._i._keys.shift) 
            {
                this._parent.SetState('run');
                return;
            }
            this._parent.SetState('walk');
            return;
        }

        this._parent.SetState('idle');
    }

    _Cleanup() 
    {
        const action = this._parent._proxy._animations['jump'].action;
        
        action.getMixer().removeEventListener('finished', this._CleanupCallback);
    }

    Exit() 
    {
        this._Cleanup();
    }

    Update(timeElapsed, input) {this._i = input;}
};
  
  
class WalkState extends State 
{
    constructor(parent) 
    {
        super(parent);
    }

    get Name() 
    {
        return 'walk';
    }

    Enter(prevState) 
    {
        const curAction = this._parent._proxy._animations['walk'].action;
        if (prevState) 
        {
            const prevAction = this._parent._proxy._animations[prevState.Name].action;

            curAction.enabled = true;

            if (prevState.Name == 'run' || prevState.Name == 'backward') 
            {
                const ratio = curAction.getClip().duration / prevAction.getClip().duration;
                curAction.time = prevAction.time * ratio;
            } 
            else if(prevState.Name == 'jump')
            {
                curAction.time = 0.325;
            }
            else 
            {
                curAction.time = 0.0;
                curAction.setEffectiveTimeScale(1.0);
                curAction.setEffectiveWeight(1.0);
            }

            curAction.crossFadeFrom(prevAction, 0.25, true);
            curAction.play();
        } 
        else 
        {
            curAction.play();
        }
    }

    Exit() {}

    Update(timeElapsed, input)
    {
        if (input._keys.forward) 
        {
            if (input._keys.space) 
            {
                this._parent.SetState('jump');
                return;
            }

            if (input._keys.shift) 
            {
                this._parent.SetState('run');
            }
            return;
        }
        else if(input._keys.backward)
        {
            this._parent.SetState('backward');
            return;
        }

        this._parent.SetState('idle');
    }
};

class BackwardState extends State 
{
    constructor(parent) 
    {
        super(parent);
    }

    get Name() 
    {
        return 'backward';
    }

    Enter(prevState) 
    {
        const curAction = this._parent._proxy._animations['backward'].action;
        if (prevState) 
        {
            const prevAction = this._parent._proxy._animations[prevState.Name].action;

            curAction.enabled = true;

            if (prevState.Name == 'run' || prevState.Name == 'walk') 
            {
                const ratio = curAction.getClip().duration / prevAction.getClip().duration;
                curAction.time = prevAction.time * ratio;
            } 
            else 
            {
                curAction.time = 0.0;
                curAction.setEffectiveTimeScale(1.0);
                curAction.setEffectiveWeight(1.0);
            }

            curAction.crossFadeFrom(prevAction, 0.5, true);
            curAction.play();
        } 
        else 
        {
            curAction.play();
        }
    }

    Exit() {}

    Update(timeElapsed, input)
    {
        if(input._keys.backward)
        {
            return;
        }
        else if (input._keys.forward) 
        {
            if (input._keys.shift) 
            {
                this._parent.SetState('run');
            }
            else
            {
                this._parent.SetState('walk');
            }
            return;
        }

        this._parent.SetState('idle');
    }
};
  
  
class RunState extends State
{
    constructor(parent) 
    {
        super(parent);
    }

    get Name() 
    {
        return 'run';
    }

    Enter(prevState) 
    {
        const curAction = this._parent._proxy._animations['run'].action;
        if (prevState) 
        {
            const prevAction = this._parent._proxy._animations[prevState.Name].action;

            curAction.enabled = true;

            if (prevState.Name == 'walk' || prevState.Name == 'backward') 
            {
                const ratio = curAction.getClip().duration / prevAction.getClip().duration;
                curAction.time = prevAction.time * ratio;
            }
            else if(prevState.Name == 'jump')
            {
                curAction.time = .1;
            }
            else 
            {
                curAction.time = 0.0;
                curAction.setEffectiveTimeScale(1.0);
                curAction.setEffectiveWeight(1.0);
            }

            curAction.crossFadeFrom(prevAction, 0.25, true);
            curAction.play();
        } 
        else 
        {
            curAction.play();
        }
    }

    Exit() {}

    Update(timeElapsed, input) 
    {
        if (input._keys.forward) 
        {
            if (input._keys.space) 
            {
                this._parent.SetState('jump');
                return;
            }

            if (!input._keys.shift) 
            {
                this._parent.SetState('walk');
            }
            return;
        }
        else if(input._keys.backward)
        {
            this._parent.SetState('backward');
            return;
        }

        this._parent.SetState('idle');
    }
};


class IdleState extends State 
{
    constructor(parent) 
    {
        super(parent);
    }

    get Name() 
    {
        return 'idle';
    }

    Enter(prevState) 
    {
        const idleAction = this._parent._proxy._animations['idle'].action;
        if (prevState) 
        {
            const prevAction = this._parent._proxy._animations[prevState.Name].action;
            idleAction.time = 0.0;
            idleAction.enabled = true;
            idleAction.setEffectiveTimeScale(1.0);
            idleAction.setEffectiveWeight(1.0);
            if(prevState.Name == 'jump') idleAction.crossFadeFrom(prevAction, 0.15, true);
            else idleAction.crossFadeFrom(prevAction, 0.5, true);
            idleAction.play();
        } 
        else 
        {
            idleAction.play();
        }
    }

    Exit() {}

    Update(_, input) 
    {
        if (input._keys.forward) 
        {
            this._parent.SetState('walk');
        }
        else if(input._keys.backward)
        {
            this._parent.SetState('backward');
        }
        else if (input._keys.space) 
        {
            this._parent.SetState('jump');
        }
        else if (input._keys.left) 
        {
            this._parent.SetState('leftTurn');
        }
        else if (input._keys.right) 
        {
            this._parent.SetState('rightTurn');
        }
        else if (input._keys.dance) 
        {
            this._parent.SetState('dance');
        }
    }
};