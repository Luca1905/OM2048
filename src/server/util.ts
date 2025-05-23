export enum Errors {
  ENTITY_NOT_FOUND = "entity not found",
  INVALID_PAYLOAD = "invalid payload",
  JSON_PARSING_FAILED = "failed parsing json",
}

const errorValues: string[] = Object.values(Errors);

export function sanitizeErrorMessage(message: unknown) {
  if (typeof message === "string" && errorValues.includes(message)) {
    return message;
  } else {
    return "an unknown error has occurred";
  }
}
