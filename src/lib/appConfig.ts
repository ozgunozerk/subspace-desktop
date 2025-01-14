import { appName, errorLogger, toFixed } from './util';
import * as path from '@tauri-apps/api/path';
import * as fs from '@tauri-apps/api/fs';

export interface IConfig {
  configDir: () => Promise<string>;
  configFullPath: () => Promise<string>;
  init: () => Promise<void>;
  validate: () => Promise<boolean>;
  remove: () => Promise<void>;
  read: () => Promise<Config>;
  write: (config: Config) => Promise<void>;
  update: (params: UpdateParams) => Promise<void>;
}

export interface Plot {
  location: string
  sizeGB: number
}

interface Config {
  [index: string]: any
  plot: Plot
  rewardAddress: string,
  launchOnBoot: boolean,
  version: string,
  nodeName: string,
}

interface UpdateParams {
  plot?: Plot;
  launchOnBoot?: boolean;
  rewardAddress?: string;
  version?: string;
  nodeName?: string;
}

const emptyConfig: Config = {
  plot: { location: '', sizeGB: 0 },
  rewardAddress: '',
  launchOnBoot: true,
  version: process.env.APP_VERSION as string,
  nodeName: '',
};

export const config: IConfig = {
  async configDir(): Promise<string> {
    return (await path.configDir()) + appName;
  },
  async configFullPath(): Promise<string> {
    return (await path.configDir()) + appName + '/' + appName + '.cfg';
  },
  async init(): Promise<void> {
    try {
      await this.read();
    } catch {
      // means there were no config file
      await fs.createDir(await this.configDir()).catch((error) => {
        if (!error.includes('exists')) {
          errorLogger(error);
        }
      });
      await this.write(emptyConfig);
    }
  },
  async validate(): Promise<boolean> {
    const config = await this.read();
    const { plot, rewardAddress, nodeName } = config;
    if (
      plot.location.length > 0 &&
      plot.sizeGB > 0 &&
      rewardAddress.length > 0 &&
      nodeName.length > 0
    ) {
      return true;
    }
    return false;
  },
  async remove(): Promise<void> {
    await fs.removeFile(await this.configFullPath()).catch((error) => {
      errorLogger(error);
    });
  },

  async read(): Promise<Config> {
    const result = await fs.readTextFile(await this.configFullPath());
    const config: Config = JSON.parse(result);
    // TODO: there maybe a better solution, or `sizeGB` should be string in the first place
    config.plot.sizeGB = toFixed(Number(config.plot.sizeGB), 2);
    return config;
  },
  async write(config: Config): Promise<void> {
    await fs.createDir(await this.configDir()).catch((error) => {
      if (!error.includes('exists')) {
        errorLogger(error);
      }
    });
    await fs.writeFile({
      path: await this.configFullPath(),
      contents: JSON.stringify(config, null, 2)
    })
      .catch((error) => {
        errorLogger(error);
      });
  },
  async update({
    plot,
    launchOnBoot,
    rewardAddress,
    version,
    nodeName,
  }: UpdateParams): Promise<void> {
    const newAppConfig = await this.read();

    if (plot !== undefined) newAppConfig.plot = plot;
    if (launchOnBoot !== undefined) newAppConfig.launchOnBoot = launchOnBoot;
    if (rewardAddress !== undefined) newAppConfig.rewardAddress = rewardAddress;
    if (version !== undefined) newAppConfig.version = version;
    if (nodeName !== undefined) newAppConfig.nodeName = nodeName;
    await this.write(newAppConfig);
  },
};
