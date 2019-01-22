export default class FileService {

  reader: FileReader;
  lastReadFile: any;

  constructor() {
    this.reader = new FileReader();
    this.reader.onload = this.readParser;
  }

  sleep = (ms: number): Promise<Function> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  readFile = async (e: any, ext: string): any => {
    if(e.target.files.length === 1) {
      let file = e.target.files[0];
      let fileExtArr = (/[.]/.exec(file.name)) ? /[^.]+$/.exec(file.name) : undefined;

      if(typeof fileExtArr !== "undefined") {
        let fileExt = fileExtArr[0];

        if(fileExt === ext || fileExt === "json") {
          this.reader.readAsText(file);
          let result: any = await this.fetchData();

          return result;
        } else {
          // unexpected file type
          return {
            status: "error",
            error: {
              code: 501,
              message: "Unexpected file type."
            }
          };
        }
      } else {
        // unexpected error
        return {
          status: "error",
          error: {
            code: 502,
            message: "Unexpected error."
          }
        };
      }
    } else {
      // more than 1 file
      return {
        status: "error",
        error: {
          code: 503,
          message: "Unexpected file type."
        }
      };
    }
  }

  readParser = (e: any) => {
    try {
      let data = JSON.parse(e.target.result);
      this.lastReadFile = { status: "success", data: data };
    } catch(e) {
      return {
        status: "error",
        error: {
          code: 504,
          message: "Parsing error."
        }
      };
    }
  }

  fetchData = async (): Promise<JSON> => {
    if(typeof this.lastReadFile !== "undefined") {
      let d = this.lastReadFile;
      this.lastReadFile = undefined;

      return d;
    } else {
      await this.sleep(300);
      return this.fetchData();
    }
  }

  isGeo3D = (d: any) => {
    if(typeof d.coordinates !== "undefined" && typeof d.id !== "undefined" && typeof d.objects !== "undefined" && typeof d.projectName !== "undefined" && typeof d.projectDescription !== "undefined") {
      return {
          "status": "success"
      };
    } else {
      // unexpected format
      return {
          status: "error",
          error: {
            code: 505,
            message: "Unexpected format in the provided data."
          }
      };
    }
  }

  isVenue = (d: any) => {
    if(typeof d.features !== "undefined" && typeof d.features[0] !== "undefined") {
      if(typeof d.features[0].properties !== "undefined") {
        if(typeof d.features[0].properties.DISPLAY_XY !== "undefined" && typeof d.features[0].properties.DISPLAY_XY.coordinates !== "undefined") {
          return {
            status: "success"
          };
        } else {
          // not a venue file
          return {
            status: "error",
            error: {
              code: 506,
              message: "Venue file's {features} array must contain {DISPLAY_XY} in it's {properties}."
            }
          };
        }
      } else {
        // unexpected geojson data
        return {
          status: "error",
          error: {
            code: 507,
            message: "File is formatted in a bad shape."
          }
        };
      }
    } else {
      // unexpected format
      return {
        status: "error",
        error: {
          code: 508,
          message: "Unexpected format in the provided data."
        }
      };
    }
  }

  saveProjectLocal = (projectData: any) => {
    let filename = `${projectData.projectName}.geo3d`;

    let file = new File([JSON.stringify(projectData, null, 2)], `${filename}`, {type: "text/plain;charset=utf-8"});

    if (window.navigator.msSaveOrOpenBlob)
      window.navigator.msSaveOrOpenBlob(file, filename);
    else {
      let a = document.createElement("a"),
          url = URL.createObjectURL(file);
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
      }, 0);
    }
  }
}
