class CustomError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message); // Pass message to the base Error class
    this.statusCode = statusCode;
  }
}

export default CustomError;
