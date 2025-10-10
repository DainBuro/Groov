import CustomError from './CustomError';

class InvalidCredentials extends CustomError {
  public statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message, statusCode);
  }
}

export default InvalidCredentials;
