import CustomError from './CustomError';

class Conflict extends CustomError {
  public statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message, statusCode);
  }
}

export default Conflict;
