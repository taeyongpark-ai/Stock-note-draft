// tsx 스크립트가 client.ts를 import 하기 전에 .env.local을 로드하기 위한 side-effect 모듈.
// 반드시 client.ts import 이전에 import 되어야 함.
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
