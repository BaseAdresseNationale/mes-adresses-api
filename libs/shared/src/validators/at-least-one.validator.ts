import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

@ValidatorConstraint({ name: 'atLeastOne' })
export class AtLeastOneValidator implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const object = args.object as any;
    const fields = args.constraints[0] as string[];
    
    // Vérifie qu'au moins un des champs est présent et non null/undefined
    return fields.some((field) => {
      const fieldValue = object[field];
      return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
    });
  }

  defaultMessage(args: ValidationArguments) {
    const fields = args.constraints[0] as string[];
    return `Au moins l'un des champs suivants doit être fourni : ${fields.join(', ')}`;
  }
}

/**
 * Décorateur pour valider qu'au moins un des champs spécifiés est présent
 * @param fields Liste des noms de champs à vérifier
 * @param validationOptions Options de validation
 */
export function AtLeastOne(
  fields: string[],
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'atLeastOne',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [fields],
      options: validationOptions,
      validator: AtLeastOneValidator,
    });
  };
}

