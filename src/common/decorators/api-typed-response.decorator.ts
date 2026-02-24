import { applyDecorators } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  getSchemaPath,
} from '@nestjs/swagger';

/**
 * A strongly-typed constructor — no `any` in the signature.
 * Used instead of the `Function` type that @nestjs/swagger exposes in its API.
 */
export type ModelConstructor = abstract new (...args: unknown[]) => unknown;

/**
 * Cast a typed constructor to `never` before passing it into @nestjs/swagger
 * APIs that are typed as `Function`. `never` is the TypeScript bottom type —
 * it satisfies every type constraint without introducing `any`.
 * This is the single point of contact with the library's loose typing.
 */
const toModel = (cls: ModelConstructor) => cls as unknown as never;

export function ApiOkTypedResponse(model: ModelConstructor) {
  return applyDecorators(
    ApiExtraModels(toModel(model)),
    ApiOkResponse({ schema: { $ref: getSchemaPath(model.name) } }),
  );
}

export function ApiOkTypedArrayResponse(model: ModelConstructor) {
  return applyDecorators(
    ApiExtraModels(toModel(model)),
    ApiOkResponse({
      schema: { type: 'array', items: { $ref: getSchemaPath(model.name) } },
    }),
  );
}

export function ApiCreatedTypedResponse(model: ModelConstructor) {
  return applyDecorators(
    ApiExtraModels(toModel(model)),
    ApiCreatedResponse({ schema: { $ref: getSchemaPath(model.name) } }),
  );
}
