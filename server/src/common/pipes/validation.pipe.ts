import {
  BadRequestException,
  ValidationPipe as _ValidationPipe,
} from "@nestjs/common";

export const ValidationPipe = new _ValidationPipe({
  exceptionFactory: (errors) => {
    for (let i = 0; i < errors.length; i++) {
      if (errors[i].constraints) {
        errors[i][errors[i].property] =
          errors[i].constraints[Object.keys(errors[i].constraints)[0]];
      } else if (errors[i].children && errors[i].children.length) {
        errors[i][errors[i].property] = {};

        for (const item of errors[i].children) {
          if (item.constraints) {
            errors[i][errors[i].property][item.property] =
              item.constraints[Object.keys(item.constraints)[0]];
          }

          if (item.children && item.children.length) {
            for (const child of item.children) {
              if (child.constraints) {
                errors[i][errors[i].property][child.property] =
                  child.constraints[Object.keys(child.constraints)[0]];
              }
            }
          }
        }
      }

      delete errors[i].target;
      delete errors[i].children;
      delete errors[i].constraints;
      delete errors[i].property;
      delete errors[i].value;
    }

    return new BadRequestException(errors);
  },
});
