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

  processData = (object: any) => {
    object.data.features.forEach((i: any) => {
      switch(object.type3d) {
        case "3D_POLYGON":
          this.add3DPolygon(i, object.id, object.settings);
          break;
        default:
          break;
      }
    });
  }

}
