import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/orbitcontrols';
import BASE_CONFIG from './base-config';
import GUIHelper from '../helpers/gui-helper/gui-helper';
import Scene from '../scene/scene';
import Stats from "stats.js";
import TWEEN from '@tweenjs/tween.js';
import LoadingOverlay from './loading-overlay';
import Physics from './physics';
import BaseGUI from './base-gui';

const canvas = document.querySelector('canvas.webgl');

export default class BaseScene {
  constructor() {
    this._scene = null;
    this._renderer = null;
    this._camera = null;
    this._controls = null;
    this._ambientLight = null;
    this._directionalLight = null;
    this._directionalLightHelper = null;
    this._axesHelper = null;
    this._loadingOverlay = null;
    this._stats = null;
    this._physics = null;
    this._baseGUI = null;

    this._windowSizes = {};
    this._isAssetsLoaded = false;

    this._init();
  }

  createGameScene() {
    const gameScene = this._gameScene = new Scene(this._camera);
    this._scene.add(gameScene);
  }

  afterAssetsLoaded() {
    this._isAssetsLoaded = true;
    this._controls.enabled = true;

    this._loadingOverlay.hide();

    this._stats.dom.style.visibility = 'visible';
    this._baseGUI.showAfterAssetsLoad();
  }

  _init() {
    this._initGUI();
    this._initFPSMeter();

    this._initScene();
    this._initRenderer();
    this._initCamera();
    this._initLights();
    this._initPhysics();
    this._initLoadingOverlay();
    this._initOnResize();

    this._initAxesHelper();
    this._setupBackgroundColor();
    this._setupGUI();

    this._initUpdate();
  }

  _initGUI() {
    const guiHelper = new GUIHelper();
    this._baseGUI = new BaseGUI(guiHelper.gui);
  }

  _initFPSMeter() {
    const stats = this._stats = new Stats();
    stats.showPanel(0);
    document.body.appendChild(stats.dom);

    this._stats.dom.style.visibility = 'hidden';
  }

  _initScene() {
    this._scene = new THREE.Scene();
  }

  _initRenderer() {
    this._windowSizes = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    const renderer = this._renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: BASE_CONFIG.antialias,
    });

    renderer.setSize(this._windowSizes.width, this._windowSizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.physicallyCorrectLights = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  _initCamera() {
    const camera = this._camera = new THREE.PerspectiveCamera(BASE_CONFIG.camera.fov, this._windowSizes.width / this._windowSizes.height, BASE_CONFIG.camera.near, BASE_CONFIG.camera.far);
    this._scene.add(camera);

    const startPosition = BASE_CONFIG.camera.startPosition;
    camera.position.set(startPosition.x, startPosition.y, startPosition.z);
    camera.lookAt(0, 0, 0);

    const controls = this._controls = new OrbitControls(this._camera, canvas);
    controls.enableDamping = true;
    controls.enabled = false;
  }

  _initLights() {
    const ambientLightConfig = BASE_CONFIG.lights.ambient;
    const ambientLight = this._ambientLight = new THREE.AmbientLight(ambientLightConfig.color, ambientLightConfig.intensity);
    this._scene.add(ambientLight);

    const directionalLightConfig = BASE_CONFIG.lights.directional;
    const directionalLight = this._directionalLight = new THREE.DirectionalLight(directionalLightConfig.color, directionalLightConfig.intensity);
    directionalLight.position.set(directionalLightConfig.position.x, directionalLightConfig.position.y, directionalLightConfig.position.z);
    this._scene.add(directionalLight);

    directionalLight.castShadow = true;
    directionalLight.shadow.camera.far = 15;
    directionalLight.shadow.mapSize.set(1024, 1024);

    const directionalLightHelper = this._directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight, 1);
    this._scene.add(directionalLightHelper);
  }

  _initPhysics() {
    this._physics = new Physics(this._scene);
  }

  _initLoadingOverlay() {
    const loadingOverlay = this._loadingOverlay = new LoadingOverlay();
    this._scene.add(loadingOverlay);
  }

  _initOnResize() {
    window.addEventListener('resize', () => {
      this._windowSizes.width = window.innerWidth;
      this._windowSizes.height = window.innerHeight;

      this._camera.aspect = this._windowSizes.width / this._windowSizes.height;
      this._camera.updateProjectionMatrix();

      this._renderer.setSize(this._windowSizes.width, this._windowSizes.height);
      this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });
  }

  _initAxesHelper() {
    const axesHelper = this._axesHelper = new THREE.AxesHelper(3);
    this._scene.add(axesHelper);
  }

  _setupBackgroundColor() {
    this._scene.background = new THREE.Color(BASE_CONFIG.backgroundColor);
  }

  _setupGUI() {
    const data = {
      controls: this._controls,
      stats: this._stats,
      physics: this._physics,
      axesHelper: this._axesHelper,
      ambientLight: this._ambientLight,
      directionalLight: this._directionalLight,
      directionalLightHelper: this._directionalLightHelper,
    }

    this._baseGUI.setup(data);
  }

  _initUpdate() {
    const clock = new THREE.Clock();
    let lastElapsedTime = 0;

    const update = () => {
      this._stats.begin();

      const elapsedTime = clock.getElapsedTime();
      const deltaTime = elapsedTime - lastElapsedTime;
      lastElapsedTime = elapsedTime;

      if (this._isAssetsLoaded) {
        TWEEN.update();
        this._physics.update(deltaTime);
        this._controls.update();

        if (this._gameScene) {
          this._gameScene.update(deltaTime);
        }

        this._renderer.render(this._scene, this._camera);
      }

      this._stats.end();
      window.requestAnimationFrame(update);
    }

    update();
  }
}