// @ts-nocheck
import { browser } from 'fumadocs-mdx/runtime/browser';
import type * as Config from '../source.config';

const create = browser<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>();
const browserCollections = {
  docs: create.doc("docs", {"index.mdx": () => import("../content/docs/index.mdx?collection=docs"), "guides/building-agents.mdx": () => import("../content/docs/guides/building-agents.mdx?collection=docs"), "guides/deployment.mdx": () => import("../content/docs/guides/deployment.mdx?collection=docs"), "guides/quickstart.mdx": () => import("../content/docs/guides/quickstart.mdx?collection=docs"), "guides/testing.mdx": () => import("../content/docs/guides/testing.mdx?collection=docs"), "registry/architecture.mdx": () => import("../content/docs/registry/architecture.mdx?collection=docs"), "registry/overview.mdx": () => import("../content/docs/registry/overview.mdx?collection=docs"), "registry/protocol.mdx": () => import("../content/docs/registry/protocol.mdx?collection=docs"), "registry/security.mdx": () => import("../content/docs/registry/security.mdx?collection=docs"), "registry/self-hosting.mdx": () => import("../content/docs/registry/self-hosting.mdx?collection=docs"), "tutorials/chat-agent.mdx": () => import("../content/docs/tutorials/chat-agent.mdx?collection=docs"), "tutorials/first-agent.mdx": () => import("../content/docs/tutorials/first-agent.mdx?collection=docs"), "tutorials/orchestration.mdx": () => import("../content/docs/tutorials/orchestration.mdx?collection=docs"), "tutorials/task-automation.mdx": () => import("../content/docs/tutorials/task-automation.mdx?collection=docs"), }),
};
export default browserCollections;