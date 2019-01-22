import FileError from './FileError';
import type { ErrorData } from './../types/Error';

export default class ErrorHandler {

  handleError = (error: ErrorData) => {
    let { message, code } = error;

    if(code >= 500 && code < 600) {
      // file errors
      throw new FileError(message, code);
    } else {
      throw new Error("Unexpected error.");
    }
  }

}
