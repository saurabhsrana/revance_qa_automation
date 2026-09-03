/** Shape shared by src/config/env.{dev|qa|prod}.ts */
export interface AppEnvConfig {
  baseUrl: string;
  otp?: string;
  oceBaseUrl?: string;
  oceBaseUrlnew?: string;
  oceUsername?: string;
  ocePassword?: string;
  ocePractice?: string;
  oceLocation?: string;
  headlessUrl?: string;
  cdpUrl?: string;
}
