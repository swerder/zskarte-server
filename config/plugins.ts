import { socketConnection } from '../src/state/socketio';

const uploadProviders = (env) => {
  const providers = {
    local: {
      config: {
        providerOptions: {
          sizeLimit: 32 * 1024 * 1024,
          localServer: {
            maxage: 300000,
          },
        },
      },
    },
    azure: {
      config: {
        provider: 'strapi-provider-upload-azure-storage',
        providerOptions: {
          account: env('STORAGE_ACCOUNT'),
          accountKey: env('STORAGE_ACCOUNT_KEY'),
          serviceBaseURL: env('STORAGE_URL'),
          containerName: env('STORAGE_CONTAINER_NAME'),
          defaultPath: '',
          maxConcurrent: 10,
        },
      },
    },
  };
  return providers[env('STORAGE_PROVIDER', 'local')];
};

export default ({ env }) => ({
  io: {
    enabled: true,
    config: {
      IOServerOptions: {
        transports: ['websocket'],
        cors: {
          origins: '*:*',
        },
      },
      events: [
        {
          name: 'connection',
          handler: socketConnection,
        },
      ],
    },
  },
  upload: uploadProviders(env),
});
