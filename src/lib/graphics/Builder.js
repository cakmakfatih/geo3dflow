import Renderer from './Renderer';

export default class Builder extends Renderer {

  project: any;

  loadProject = (project: any) => {
    this.project = Object.assign({}, project, {objects: project.objects.map((i: any) => Object.assign({}, i))});

    this.setOffsets([this.project.coordinates.lat, this.project.coordinates.lon]);

    this.project.objects.forEach((i: any) => {
      this.processData(i);
    });
  }

  renderObject = (object: any) => {
    this.project.objects.push(Object.assign({}, object));
    this.processData(object);
  }

  processData = (object: any) => {
    object.data.features.forEach((i: any) => {
      switch(object.type3d) {
        case "3D_POLYGON":
          this.add3DPolygon(i, object.id, object.settings);
          break;
        case "BUILDINGS":
          this.addBuildings(i, object.id, object.settings);
          break;
        default:
          break;
      }
    });
  }

}
