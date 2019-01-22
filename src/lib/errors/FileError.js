export default class FileError extends Error {

  constructor(...args) {
    super(...args);
    Error.captureStackTrace(this, FileError);
  }

}
