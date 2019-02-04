import Renderer from './Renderer';

export default class Builder extends Renderer {

  project: any;

  loadProject = (project: any) => {

    let levels = project.levels.map((i) => Object.assign([], i));

    levels.forEach((i: any) => {
      i.data = Object.assign({}, i.data, {
        features: i.data.features.map((j: any) => Object.assign({}, j))
      });
    });

    this.project = Object.assign({}, project, {objects: project.objects.map((i: any) => Object.assign({}, i)), levels});

    this.setOffsets([this.project.coordinates.lat, this.project.coordinates.lon]);
    this.project.groundStart = this.project.objects.find((i: any) => i.name === "VENUE").settings.extrude.depth / 2;

    this.project.levels.forEach((i: any) => {
      this.processData(i);
    });

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
        case "LEVELS":
          this.addLevels(i, object.id, object.settings);
          break;
        default:
          break;
      }
    });
  }

}
