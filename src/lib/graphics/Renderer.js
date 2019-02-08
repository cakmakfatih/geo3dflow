import * as THREE from "three";
import { Scene, PerspectiveCamera, WebGLRenderer } from 'three';
import { VectorGenerator } from './../services/VectorGenerator';
import type { ScaledVector } from './../types/ScaledVector';
import SVGLoader from "three-svg-loader";

// icons
import Elevator from '../../icons/elevator.svg';
import Escalator from '../../icons/escalator.svg';
import Food from '../../icons/fast-food.svg';
import Parking from '../../icons/parking.svg';
import Stairs from '../../icons/stairs.svg';
import Restroom from '../../icons/toilet.svg';

const OrbitControls = require('three-orbit-controls')(THREE);

export default class Renderer {

  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  controls: CameraControls;
  vectorGenerator: VectorGenerator;
  container: HTMLDivElement;
  activeLevel: number;
  project: any;
  unitColors: Array<mixed>

  initBuilder = (container: HTMLDivElement) => {
    this.container = container;
    this.unitColors = [];
    this.activeLevel = 0;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(90, this.container.getBoundingClientRect().width / this.container.getBoundingClientRect().height, 1, 10000);
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
    this.controls.maxDistance = 1000;

    this.addSkybox();
    this.viewLoop();
    this.addLights();
  }

  addLights = () => {
    let directionalLight = new THREE.AmbientLight(0xffffff, 1);
    this.scene.add(directionalLight);
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

    let material: THREE.MeshPhongMaterial = new THREE.MeshPhongMaterial({
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

  addGround = (coords: number[]) => {
    // to develop faster, added grid system which will be removed
    
    let size = 10000;
    let divisions = 100;

    let gridHelper = new THREE.GridHelper( size, divisions );
    this.scene.add(gridHelper);
    /*
    var geometry = new THREE.PlaneGeometry( 10000, 10000, 32, 32 );
    let textureLoader = new THREE.TextureLoader();

    let mapImage = `https://api.mapbox.com/styles/v1/mapbox/streets-v10/static/${coords[0]},${coords[1]},15.0,0,0/1280x1280?access_token=pk.eyJ1IjoiY2FrbWFrZmF0aWgiLCJhIjoiY2pxcGk1d3ZrMDFwYjQ5bzFqNncyYjl2NyJ9.MtGJZ74Cu-6R7K52rFrNeQ`;

    let map = textureLoader.load(mapImage);

    map.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    map.minFilter = THREE.LinearFilter;

    var material = new THREE.MeshPhongMaterial({map: map, side: THREE.DoubleSide});

    let ground = new THREE.Mesh(geometry, material);
    ground.rotation.x -= Math.PI/2;

    this.scene.add(ground);
    */
  }

  addLevels = (i: any, id: string, settings: any) => {
    let material = new THREE.MeshPhongMaterial({
      color: i.settings.material.color,
      depthTest: false
    });

    let sidesMaterial = new THREE.MeshPhongMaterial({ color: parseInt(i.settings.material.sideColor, 16), side: THREE.DoubleSide });
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
    let geometry = new THREE.ExtrudeGeometry(shape, i.settings.extrude);

    let item = new THREE.Mesh(geometry, [material, sidesMaterial]);
    item.renderOrder = 1;

    item.rotation.x += -Math.PI / 2;
    item.position.setY(this.project.groundStart + i.settings.extrude.depth);

    i.item = item;

    this.scene.add(item);
  }

  randomColor = () => {
    let colors = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];
    return colors[Math.floor(Math.random() * colors.length)] + colors[Math.floor(Math.random() * colors.length)];
  }

  addUnits = (i: any, id: string, settings: any) => {
    // function is not optimized
    let material = new THREE.LineBasicMaterial({
      color: 0x505050,
      depthTest: false
    });


    let iL = this.project.levels[0].data.features.find((f: any) => f.properties.LEVEL_ID === i.properties.LEVEL_ID);

    if(typeof iL !== "undefined" && iL.properties.ORDINAL === this.activeLevel) {
      // unit ground

      i.geometry.coordinates.forEach((j: any) => {
        j.forEach((k: any) => {
          let startCoords = this.vectorGenerator.generateVector(k[0]);
          let points = [];
          
          k.slice(1).forEach((q: any) => {
            let scaledVector: ScaledVector = this.vectorGenerator.generateVector(q);
            points.push(new THREE.Vector2(scaledVector.x, -scaledVector.z));
          });

          let shape = new THREE.Shape(points);
          shape.moveTo(startCoords.x, -startCoords.z);
          if(this.unitColors.find((t: any) => t.name === i.properties.CATEGORY) !== -1) {
            let red = this.randomColor();
            let green = this.randomColor();
            let blue = this.randomColor();

            this.unitColors.push({
              name: i.properties.CATEGORY,
              color: red + green + blue
            });
          }

          let geo = new THREE.ExtrudeGeometry(shape, settings.extrude);

          let material = new THREE.LineBasicMaterial({
            color: parseInt(this.unitColors.find((t: any) => t.name === i.properties.CATEGORY).color, 16),
            depthTest: false
          });

          let item = new THREE.Mesh(geo, [material]);
          item.renderOrder = 2;
          item.rotation.x += -Math.PI / 2;
          item.position.setY(this.project.groundStart + this.project.levels[this.activeLevel].data.features[0].settings.extrude.depth + 3);
          
          this.scene.add(item);
        });
      });


      // unit lines
      i.geometry.coordinates.forEach((j: any) => {
        j.forEach((k: any) => {
          let path = new THREE.Path();
          let startCoords = this.vectorGenerator.generateVector(k[0]);
          path.moveTo(startCoords.x, -startCoords.z);
          k.forEach((q: any) => {
              let scaledVector: ScaledVector = this.vectorGenerator.generateVector(q);
              path.lineTo(scaledVector.x, -scaledVector.z);
          });
          let pts = path.getPoints();
          let geometry = new THREE.BufferGeometry().setFromPoints(pts);
          let line = new THREE.Line(geometry, material);
          line.rotation.x += -Math.PI / 2;
          line.position.setY(this.project.groundStart + this.project.levels[this.activeLevel].data.features[0].settings.extrude.depth + 7);
          line.renderOrder = 3;

          this.scene.add(line);
        });
      });
    }
  }

  setVisibility = () => {
    this.project.objects.forEach((i: any) => {
      if(i.level !== this.activeLevel && i.name !== "Venue") {
        i.item.traverse((obj: any) => obj.visible = false);
      } else {
        i.item.traverse((obj: any) => obj.visible = true);
      }
    });
  }

  addBuildings = (i: any, id: string, settings: any) => {
    /*
    let material = new THREE.MeshPhongMaterial({
      color: 0xf9f9f9
    });

    let sidesMaterial = new THREE.MeshPhongMaterial({ color: 0x909090, side: THREE.DoubleSide });

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

    let geometry = new THREE.ExtrudeBufferGeometry(shape, {...settings.extrude, depth: i.properties.HEIGHT * 3});
    let item = new THREE.Mesh(geometry, [material, sidesMaterial]);

    item.rotation.x += -Math.PI / 2;
    item.position.setY(this.project.groundStart + settings.extrude.depth / 2);

    this.project.objects.find((i: any) => i.id === id).item = item;

    this.scene.add(item);

    */


    // needs a bit more geometry to work correctly
    /*
    let material = new THREE.MeshPhongMaterial({
      color: settings.material.color,
      depthTest: false
    });
    let sidesMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    let coordinatesArray = i.geometry.coordinates[0];
    
    let shape = new THREE.Shape();
    
    coordinatesArray.forEach((j: any) => {
      let hole = new THREE.Shape();
      let startPoint = this.vectorGenerator.generateVector(j[0]);
      
      shape.moveTo(startPoint.x, -startPoint.z);
      hole.moveTo(startPoint.x, -startPoint.z);
      j.slice(1).forEach((f: any) => {
        let coords = this.vectorGenerator.generateVector(f, i.properties.HEIGHT*3);
        shape.lineTo(coords.x, -coords.z);
        hole.lineTo(coords.x + 10, -coords.z + 10);
      });
      let points = hole.extractPoints();
      let path = new THREE.Path(points.shape);
      shape.holes.push(path);
    });

    
    
    let geometry = new THREE.ExtrudeGeometry(shape, {...settings.extrude, depth: i.properties.HEIGHT*3});
    let item = new THREE.Mesh(geometry, [material, sidesMaterial]);
    item.renderOrder = 5;
    item.rotation.x = -Math.PI/2;
    item.position.setY(this.project.groundStart + settings.extrude.depth/2);
    
    this.scene.add(item);
    */
    let material = new THREE.MeshPhongMaterial({
      color: 0xf9f9f9,
      side: THREE.DoubleSide
    });
    let coordinatesArray = i.geometry.coordinates[0][0];
    let walls = new THREE.Geometry();

    coordinatesArray.forEach((f) => {
        let coordinates = this.vectorGenerator.generateVector(f, i.properties.HEIGHT);
        walls.vertices.push(new THREE.Vector3(coordinates.x, 0, coordinates.z));
        walls.vertices.push(new THREE.Vector3(coordinates.x, coordinates.y*3, coordinates.z));
    });

    let previousVertexIndex = walls.vertices.length - 2;

    for(let i = 0; i < walls.vertices.length; i += 2){
        walls.faces.push(new THREE.Face3(i, i + 1, previousVertexIndex));
        walls.faces.push(new THREE.Face3(i + 1, previousVertexIndex + 1, previousVertexIndex));
        previousVertexIndex = i;
    }

    walls.computeVertexNormals();
    walls.computeFaceNormals();
    let items = new THREE.Mesh(walls, [material]);
    items.position.setY(this.project.groundStart + settings.extrude.depth/2);
    items.renderOrder = 5;
    this.scene.add(items);

    this.project.objects.find((i: any) => i.id === id).item = items;
    
  }

  add3DPolygon = (i: any, id: string, settings: any) => {
    let material = new THREE.MeshPhongMaterial({
      color: parseInt(settings.material.color, 16)
    });

    let sidesMaterial = new THREE.MeshPhongMaterial({ color: parseInt(settings.material.sideColor, 16), side: THREE.DoubleSide });

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

    let geometry = new THREE.ExtrudeGeometry(shape, settings.extrude);
    let item = new THREE.Mesh(geometry, [material, sidesMaterial]);

    item.rotation.x += -Math.PI / 2;
    item.position.setY(settings.extrude.depth / 2);

    this.project.objects.find((i: any) => i.id === id).item = item;

    this.scene.add(item);
  }

  addPoints = (i: any, id: string, settings: any) => {
    /*
    Eating/Drinking: true
    Elevator: true
    Escalator: true
    Parking: true
    Restroom: true
    Stairs: true
    */
    let iL = this.project.levels[0].data.features.find((f: any) => f.properties.LEVEL_ID === i.properties.LEVEL_ID);

    if(typeof iL !== "undefined" && iL.properties.ORDINAL === this.activeLevel) {
      let ico;
      let pos = this.vectorGenerator.generateVector(i.geometry.coordinates);

      switch(i.properties.CATEGORY) {
        case "Eating/Drinking":
          ico = Food;
          break;
        case "Elevator":
          ico = Elevator;
          break;
        case "Escalator":
          ico = Escalator;
          break;
        case "Parking":
          ico = Parking;
          break;
        case "Restroom":
          ico = Restroom;
          break;
        case "Stairs":
          ico = Stairs;
          break;
        default:
          break;
      }
      
      let svgLoader = new SVGLoader();
      svgLoader.load(
        ico,
        (paths: any) => {
          let group = new THREE.Group();
          paths.forEach((j: any) => {
            var material = new THREE.MeshBasicMaterial( {
              color: j.color,
              side: THREE.DoubleSide,
              depthWrite: false,
              depthTest: false
            } );

            var shapes = j.toShapes( true );

            for ( var k = 0; k < shapes.length; k ++ ) {

              var shape = shapes[ k ];
              var geometry = new THREE.ShapeBufferGeometry( shape );
              var mesh = new THREE.Mesh( geometry, material );
              mesh.position.set(pos.x, this.project.groundStart + this.project.levels[this.activeLevel].data.features[0].settings.extrude.depth + 5, -pos.z);
              mesh.renderOrder = 4;
              mesh.rotation.x = -Math.PI/2;
              mesh.scale.set(0.05, 0.05, 0.05);
              group.add( mesh );

            }
          });
          this.scene.add(group);
        }
      );
    }
  }

}
