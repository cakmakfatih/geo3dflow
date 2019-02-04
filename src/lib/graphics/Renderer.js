import * as THREE from "three";
import { Scene, PerspectiveCamera, WebGLRenderer } from 'three';
import { VectorGenerator } from './../services/VectorGenerator';
import type { ScaledVector } from './../types/ScaledVector';
const OrbitControls = require('three-orbit-controls')(THREE);

export default class Renderer {

  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  controls: CameraControls;
  vectorGenerator: VectorGenerator;
  container: HTMLDivElement;
  project: any;

  initBuilder = (container: HTMLDivElement) => {
    this.container = container;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(90, this.container.getBoundingClientRect().width / this.container.getBoundingClientRect().height, 0.1, 10000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.setSize(this.container.getBoundingClientRect().width, this.container.getBoundingClientRect().height);
    this.container.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => {
      this.renderer.setSize(this.container.getBoundingClientRect().width, this.container.getBoundingClientRect().height);
      this.camera.aspect = this.container.offsetWidth / this.container.getBoundingClientRect().height;
      this.camera.updateProjectionMatrix();
    });

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.maxPolarAngle = Math.PI/2;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 2000;

    this.addSkybox();
    this.viewLoop();
  }

  viewLoop = () => {
    requestAnimationFrame(this.viewLoop);
    this.update();
    this.render();
  }

  render = () => {
    this.renderer.render(this.scene, this.camera);
  }

  update = () => {
    if(this.camera.position.y < 90) {
      this.camera.position.setY(90);
    }
    this.controls.update();
  }

  addSkybox = () => {
    let geometry = new THREE.BoxGeometry(10000, 10000, 10000);

    let material: THREE.MeshBasicMaterial = new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        color: 0xdddddd
    });

    let cube = new THREE.Mesh(geometry, material);
    this.scene.add(cube);
  }

  setOffsets = (coords: any) => {
    this.project.coordinates = coords;

    this.vectorGenerator = new VectorGenerator(undefined, coords);
    this.camera.position.set(1000, 1000, 1000);
    this.camera.lookAt(0, 0, 0);
    this.addGround(coords);
  }

  addGround(coords: number[]) {
    var geometry = new THREE.PlaneGeometry( 10000, 10000, 32 );
    let textureLoader = new THREE.TextureLoader();

    let mapImage = `https://api.mapbox.com/styles/v1/mapbox/streets-v10/static/${coords[0]},${coords[1]},15.0,0,0/1280x1280?access_token=pk.eyJ1IjoiY2FrbWFrZmF0aWgiLCJhIjoiY2pxcGk1d3ZrMDFwYjQ5bzFqNncyYjl2NyJ9.MtGJZ74Cu-6R7K52rFrNeQ`;

    let map = textureLoader.load(mapImage);

    map.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    map.minFilter = THREE.LinearFilter;

    var material = new THREE.MeshBasicMaterial({map: map, side: THREE.DoubleSide});

    let ground = new THREE.Mesh(geometry, material);
    ground.rotation.x -= Math.PI/2;

    this.scene.add(ground);
  }

  addLevels = (i: any, id: string, settings: any) => {
    let material = new THREE.MeshBasicMaterial({
      color: i.settings.material.color
    });

    let sidesMaterial = new THREE.MeshBasicMaterial({ color: parseInt(settings.material.sideColor, 16), side: THREE.DoubleSide });
    let pts = [];

    i.geometry.coordinates.forEach((j: any) => {
      j.forEach((k: any) => {
        k.slice(1).forEach((q: any) => {
            let scaledVector: ScaledVector = this.vectorGenerator.generateVector(q);
            pts.push(new THREE.Vector2(scaledVector.x, -scaledVector.z));
        });
      });
    });

    let shape = new THREE.Shape(pts);
    let geometry = new THREE.ExtrudeBufferGeometry(shape, settings.extrude);

    let item = new THREE.Mesh(geometry, [material, sidesMaterial]);

    item.rotation.x += -Math.PI / 2;
    item.position.setY(settings.extrude.depth);

    i.item = item;

    this.scene.add(item);
  }

  randomColor = () => {
    let colors = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];
    return colors[Math.floor(Math.random() * colors.length)] + colors[Math.floor(Math.random() * colors.length)];
  }

  addBuildings = (i: any, id: string, settings: any) => {
    let material = new THREE.MeshBasicMaterial({
      color: settings.material.color
    });

    let coordinatesArray = i.geometry.coordinates[0][0];
    let walls = new THREE.Geometry();

    coordinatesArray.forEach((f) => {
        let coordinates = this.vectorGenerator.generateVector(f, i.properties.HEIGHT);
        walls.vertices.push(new THREE.Vector3(coordinates.x, 0, coordinates.z));
        walls.vertices.push(new THREE.Vector3(coordinates.x, coordinates.y*5, coordinates.z));
    });

    let previousVertexIndex = walls.vertices.length - 2;

    for(let i = 0; i < walls.vertices.length; i += 2){
        walls.faces.push(new THREE.Face3(i, i + 1, previousVertexIndex));
        walls.faces.push(new THREE.Face3(i + 1, previousVertexIndex + 1, previousVertexIndex));
        previousVertexIndex = i;
    }

    walls.computeVertexNormals();
    walls.computeFaceNormals();
    material.side = THREE.DoubleSide;
    let items = new THREE.Mesh(walls, material);
    items.position.setY(this.project.groundStart * 2);
    this.scene.add(items);

    this.project.objects.find((i: any) => i.id === id).item = items;
  }

  add3DPolygon = (i: any, id: string, settings: any) => {
    let material = new THREE.MeshBasicMaterial({
      color: parseInt(settings.material.color, 16)
    });

    let sidesMaterial = new THREE.MeshBasicMaterial({ color: parseInt(settings.material.sideColor, 16), side: THREE.DoubleSide });

    let shape = new THREE.Shape();

    let startCoords = this.vectorGenerator.generateVector(i.geometry.coordinates[0][0][0]);

    shape.moveTo(startCoords.x, -startCoords.z);

    i.geometry.coordinates.forEach((j: any) => {
      j.forEach((k: any) => {
        k.slice(1).forEach((q: any) => {
            let scaledVector: ScaledVector = this.vectorGenerator.generateVector(q);
            shape.lineTo(scaledVector.x, -scaledVector.z);
        });
      });
    });

    let geometry = new THREE.ExtrudeBufferGeometry(shape, settings.extrude);
    let item = new THREE.Mesh(geometry, [material, sidesMaterial]);

    item.rotation.x += -Math.PI / 2;
    item.position.setY(settings.extrude.depth / 2);

    this.project.objects.find((i: any) => i.id === id).item = item;

    this.scene.add(item);
  }

}
