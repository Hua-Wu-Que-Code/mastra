import type { JsonSchema } from './types';
import { t as studioT } from '@/lib/i18n';

export const complexSchema: JsonSchema = {
  type: 'object',
  properties: {
    user: {
      type: 'object',
      get title() {
        return studioT('User');
      },
      properties: {
        email: {
          type: 'string',
          get title() {
            return studioT('Email');
          },
        },
        roles: {
          type: 'array',
          get title() {
            return studioT('Roles');
          },
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                get title() {
                  return studioT('Role Name');
                },
              },
              permissions: {
                type: 'string',
                get title() {
                  return studioT('Permissions');
                },
              },
            },
          },
        },
        address: {
          type: 'object',
          get title() {
            return studioT('Address');
          },
          properties: {
            street: {
              type: 'string',
              get title() {
                return studioT('Street');
              },
            },
            city: {
              type: 'string',
              get title() {
                return studioT('City');
              },
            },
            country: {
              type: 'string',
              get title() {
                return studioT('Country');
              },
            },
            zipCode: {
              type: 'string',
              get title() {
                return studioT('Zip Code');
              },
            },
          },
        },
      },
    },
    metadata: {
      type: 'object',
      get title() {
        return studioT('Metadata');
      },
      properties: {
        createdAt: {
          type: 'string',
          get title() {
            return studioT('Created At');
          },
        },
        updatedAt: {
          type: 'string',
          get title() {
            return studioT('Updated At');
          },
        },
        version: {
          type: 'number',
          get title() {
            return studioT('Version');
          },
        },
      },
    },
  },
};
