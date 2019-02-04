import React, { Component } from 'react';
import type { EditorState } from './types/EditorState';
import Layout from './components/Layout';
import Builder from './graphics/Builder';
import FileService from './services/FileService';
import IdService from './services/IdService';
import Mixin from './../mixin';

import ErrorHandler from './errors/ErrorHandler';

// to be able to demonstrate faster, will be removed when deployed
import ExampleData from './../sample_data/example.json';

// default Config settings
import Config from './../config.json';

class ReactComponent extends Component<{}, EditorState>{}

export default class Editor extends Mixin(ReactComponent, FileService, IdService, Builder, ErrorHandler) {

  builder: Builder;
  lastMenu: string;
  project: any;

  addObjectData: any;

  componentWillMount = () => {
    this.project = {};
    this.addObjectData = {};

    this.project.projectName = "";
    this.project.projectDescription = "";

    this.setState({
      menu: "START",
      activeLevel: 0,
      objects: []
    });
  }

  componentDidMount = async () => {
    // to be able to demonstrate faster,this part will be removed on publish
    // this.changeMenu("PROJECT_MENU");
    // this.openProject(ExampleData);
  }

  createProject = () => {
    let projectId = this.guid();
    let { objects } = this.state;

    this.project = {
      ...this.project,
      id: projectId
    };

    if(objects.length > 0 && this.project.projectName.length > 0) {
      this.changeMenu("PROJECT_MENU");

      let offsetCoords = objects.find(i => i.type3d === "3D_POLYGON").data.features.find((i: any) => typeof i.properties.DISPLAY_XY !== "undefined").properties.DISPLAY_XY.coordinates;

      this.project.coordinates = {lat: offsetCoords[0], lon: offsetCoords[1]};

      this.openProject(this.projectData);
    } else {
      throw new Error("You can't create a project without providing a valid venue data and a name.");
    }
  }

  changeMenu = (menu: string) => {
    this.lastMenu = this.state.menu;

    this.setState({
      menu
    });
  }

  renderMenu = () => {
    let { menu } = this.state;

    switch(menu) {
      case "START":
        return this.startMenu();
      case "NEW_MODEL_1":
        return this.newModel1();
      case "NEW_MODEL_2":
        return this.newModel2();
      case "MANUAL_GEOJSON":
        return this.manualGeoJSON();
      case "PROJECT_MENU":
        return this.projectMenu();
      case "ADD_ONE":
        return this.addOne();
      case "EDIT_ONE":
        return this.editOne();
      default:
        break;
    }
  }

  get projectData() {
    return {...this.project, objects: this.state.objects};
  }

  get projectLevels() {
    let levels = {};

    this.state.objects.sort((a, b) => a.level > b.level ? 1 : -1).forEach(i => levels[i.level] = true);

    return levels;
  }

  addObject = async () => {
    if(typeof this.addObjectData.object !== "undefined") {
      let { objects } = this.state;
      let type = typeof this.addObjectData.type !== "undefined" ? this.addObjectData.type : "BUILDINGS";

      let {
        object,
        name,
        level
      } = this.addObjectData;

      switch(type) {
        case "BUILDINGS":
          if(typeof object.features[0] !== "undefined") {
            if(typeof object.features[0].properties.HEIGHT !== "undefined") {
              let id = this.guid();
              let o = {data: object, type3d: type, id, name: name, level: level, settings: { material: { sideColor: Config.sideColor, color: Config.sideColor }, extrude: {...Config.extrudeSettings, depth: object.features[0].properties.HEIGHT }}};

              objects.push(o);

              await this.setState({
                objects
              });

              this.renderObject(o);
            }
          } else {
            console.log("Type error");
          }
          break;
        case "LEVELS":
          let id = this.guid();
          let o = {data: object, type3d: type, id, name: name, level: level, settings: { material: { sideColor: Config.sideColor, color: Config.sideColor } }};
          this.renderObject(o);
          break;
        default:
          break;
      }
    }
  }

  addGeoJSON = async (e: any) => {
    let res = await this.readFile(e, "geojson");

    if(res.status === "error") {
      this.handleError(res.error);
    } else {
      this.addObjectData.object = res.data;
    }
  }

  renderLevels = () => {
    let { activeLevel } = this.state;
    return (
      <section className="levels">
        {Object.keys(this.projectLevels).map((i) => <div className={activeLevel === parseInt(i, 10) ? 'active' : ''} key={i}>{i}</div>)}
      </section>
    );
  }

  openProject = async (data: any) => {
    let {
      projectName,
      projectDescription,
      id,
      objects,
      coordinates
    } = data;

    await this.setState({
      objects
    });

    this.project = { projectName, projectDescription, coordinates, id };

    this.initBuilder(this.refs["3d-view-container"]);
    this.loadProject(this.projectData);
  }

  getGeo3D = async (e: any) => {
    let { objects } = this.state;

    if(!(objects.length === 0)) {
      this.setState({
        objects: []
      });
    }

    let res = await this.readFile(e, "geo3d");

    if(res.status === "error") {
      this.handleError(res.error);
    } else {
      this.openProject(res.data);
    }
  }

  getGeoJSON = async (e: any) => {
    let { objects } = this.state;
    let res = await this.readFile(e, "geojson");

    if(res.status === "error") {
      this.handleError(res.error);
    } else {
      let id = this.guid();

      objects.push( {data: res.data, type3d: "3D_POLYGON", name: "VENUE", id, level: 0, settings: { extrude: Config.extrudeSettings, material: { sideColor: Config.sideColor, color: Config.defaultColor} } });
    }
  }

  getVenue = async (e: any) => {
    let { objects } = this.state;

    if(!(objects.length === 0)) {
      await this.setState({
        objects: []
      });
    }

    let res = await this.readFile(e, "geojson");

    if(res.status === "success") {
      let isVenue = this.isVenue(res.data);

      if(isVenue.status === "success") {
        let id = this.guid();

        objects.push({data: res.data, type3d: "3D_POLYGON", name: "VENUE", id, level: 0, settings: {extrude: Config.extrudeSettings, material: {sideColor: Config.sideColor, color: Config.defaultColor}} });
      } else {
        throw new Error(isVenue.error);
      }
    } else {
      throw new Error(res.error);
    }
  }

  validateManualData = (type: "ANY") => {
    // needs to be editted due to edit project after creation
    let { objects } = this.state;
    let { value } = (this.refs["manual-geojson"]);

    try {
      let data = JSON.parse(value);
      let isVenue = this.isVenue(data);

      if(isVenue.status === "success") {
        let id = this.guid();

        objects.push({data, type3d: "3D_POLYGON", name: "VENUE", id, level: 0,settings: {extrude: Config.extrudeSettings, material: {sideColor: Config.sideColor, color: Config.defaultColor}}});

        this.setState({
          menu: "NEW_MODEL_1",
          objects
        });
      } else {
        this.handleError(isVenue.error);
      }
    } catch(e) {
      this.handleError(e);
    }
  }

  getLevels = async (e: any) =>  {
    let res = await this.readFile(e, "geojson");

    if(res.status === "success") {
      let isLevels = this.isLevels(res.data);

      if(isLevels.status === "success") {
        let id = this.guid();
        this.project.levels = res.data;

        
      } else {
        throw new Error(isLevels.error);
      }
    } else {
      throw new Error(res.error);
    }
  }

  startMenu = () => (
    <aside className="aside">
      <section className="aside-top">
        <div className="form-group">
          <button className="btn-default btn-bordered" onClick={() => this.changeMenu("NEW_MODEL_1")}>
            <i className="fas fa-plus"></i>
            NEW
          </button>
        </div>
        <div className="form-group">
          <label htmlFor="up-v" className="btn-default btn-bordered">
              <i className="far fa-folder-open"></i>
              OPEN
          </label>
          <input type="file" accept=".geo3d" id="up-v" className="upload-default" onChange={this.getGeo3D} />
        </div>
      </section>
    </aside>
  )

  newModel1 = () => (
    <aside className="aside">
      <section className="aside-top">
        <div className="btn-back" onClick={() => {
          this.project.projectName = "";
          this.project.projectDescription = "";
          this.setState({
            menu: "START",
            objects: []
          });
        }}>
          <i className="fas fa-chevron-left"></i>
          <span>BACK</span>
        </div>
        <div className="form-group">
          <label htmlFor="" className="label-default">Project Name (*)</label>
          <input type="text" className="inp-default" onChange={(e) => this.project.projectName = e.target.value} />
        </div>
        <div className="form-group">
          <label htmlFor="" className="label-default">Project Description</label>
          <textarea rows={5} className="inp-default" onChange={(e) => this.project.projectDescription = e.target.value} />
        </div>
        <div className="form-group">
          <label htmlFor="up-v" className="btn-default">
            <i className="fas fa-folder-open"></i>
            Venue GeoJSON
          </label>
          <input type="file" accept=".geojson" id="up-v" className="upload-default" onChange={this.getVenue} />
        </div>
        <div className="form-group">
          <span className="link-span" onClick={() => this.setState({menu: "MANUAL_GEOJSON"})}>Alternatively, you can manually enter GeoJSON data</span>
        </div>
      </section>
      <button className="btn-default btn-bordered" onClick={() => this.changeMenu("NEW_MODEL_2")}>
          NEXT
      </button>
    </aside>
  )

  newModel2 = () => (
    <aside className="aside">
      <section className="aside-top">
        <div className="btn-back" onClick={() => {
          this.project.projectName = "";
          this.project.projectDescription = "";
          this.setState({
            menu: "START",
            objects: []
          });
        }}>
          <i className="fas fa-chevron-left"></i>
          <span>BACK</span>
        </div>
        <div className="form-group">
          <label htmlFor="up-v" className="btn-default">
            <i className="fas fa-folder-open"></i>
            Levels GeoJSON
          </label>
          <input type="file" accept=".geojson" id="up-v" className="upload-default" onChange={this.getLevels} />
        </div>
        <div className="form-group">
          <span className="link-span" onClick={() => this.setState({menu: "MANUAL_GEOJSON"})}>Alternatively, you can manually enter GeoJSON data</span>
        </div>
      </section>
      <button className="btn-default btn-bordered" onClick={this.createProject}>
          NEXT
      </button>
    </aside>
  )

  manualGeoJSON = () => (
    <aside className="aside">
      <section className="aside-top">
        <div className="btn-back" onClick={() => this.setState({menu: "NEW_MODEL_1"})}>
          <i className="fas fa-chevron-left"></i>
          <span>BACK</span>
        </div>
        <div className="form-group">
          <label htmlFor="" className="label-default">Venue GeoJSON</label>
          <textarea rows={12} className="inp-default" ref="manual-geojson" />
        </div>
      </section>
      <button className="btn-default" onClick={this.validateEntered}>
        SAVE
      </button>
    </aside>
  )

  projectMenu = () => (
    <aside className="aside">
      <section className="aside-top">
        <div className="form-group">
          <button className="btn-default" onClick={() => this.changeMenu("ADD_ONE")}>
            <i className="fas fa-plus"></i>
            ADD
          </button>
        </div>
        <div className="form-group">
          <button className="btn-default" onClick={() => this.changeMenu("EDIT_ONE")}>
            <i className="fas fa-pen"></i>
            EDIT
          </button>
        </div>
        <div className="form-group">
          <button className="btn-default" onClick={() => this.saveProjectLocal(this.projectData)}>
            <i className="fas fa-download"></i>
            SAVE
          </button>
        </div>
      </section>
      <button className="btn-default" onClick={() => window.location.reload()}>
        QUIT
      </button>
    </aside>
  )

  addOne = () => (
    <aside className="aside">
      <section className="aside-top">
        <div className="btn-back" onClick={() => this.setState({
            menu: this.lastMenu
        })}>
          <i className="fas fa-chevron-left"></i>
          <span>BACK</span>
        </div>
        <div className="form-group">
          <label htmlFor="" className="label-default">Name (*)</label>
          <input type="text" className="inp-default" onChange={(e) => this.addObjectData.name = e.target.value} />
        </div>
        <div className="form-group">
          <label htmlFor="" className="label-default">Level (*)</label>
          <input type="text" className="inp-default" onChange={(e) => this.addObjectData.level = e.target.value} />
        </div>
        <div className="form-group">
          <label htmlFor="" className="label-default">Type (*)</label>
          <select className="inp-default" onChange={(e) => this.addObjectData.type = e.target.value}>
            <option value="BUILDINGS">BUILDINGS</option>
            <option value="LEVELS">LEVELS</option>
            <option value="GROUND">GROUND</option>
            <option value="OBJECT">OBJECT</option>
            <option value="LINE">LINE</option>
            <option value="PATH">PATH</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="up-v" className="btn-default">
            <i className="fas fa-upload"></i>
            GeoJSON
          </label>
          <input type="file" accept=".geojson" id="up-v" className="upload-default" onChange={this.addGeoJSON} />
        </div>
        <div className="form-group">
          <span className="link-span" onClick={() => this.setState({menu: "MANUAL_GEOJSON"})}>Alternatively, you can manually enter GeoJSON data</span>
        </div>
      </section>
      <button className="btn-default btn-bordered" onClick={this.addObject}>
        <i className="fas fa-plus"></i>
        ADD
      </button>
    </aside>
  )

  editOne = () => (
    <aside className="aside">
      <section className="aside-top">
        <div className="form-group">
          <button className="btn-default btn-bordered" onClick={() => this.changeMenu("NEW_MODEL_1")}>
            <i className="fas fa-plus"></i>
            NEW
          </button>
        </div>
        <div className="form-group">
          <label htmlFor="up-v" className="btn-default btn-bordered">
              <i className="far fa-folder-open"></i>
              OPEN
          </label>
          <input type="file" accept=".geo3d" id="up-v" className="upload-default" onChange={this.getGeo3D} />
        </div>
      </section>
    </aside>
  );

  render = () => (
    <Layout flexDirection="row">
      {this.renderMenu()}
      {this.renderLevels()}
      <div ref="3d-view-container" id="geo3d-view-container" />
    </Layout>
  )

}