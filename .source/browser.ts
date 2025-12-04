// @ts-nocheck
import { browser } from 'fumadocs-mdx/runtime/browser';
import type * as Config from '../source.config';

const create = browser<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>();
const browserCollections = {
  docs: create.doc("docs", {"index.mdx": () => import("../content/docs/index.mdx?collection=docs"), "api-reference/cli.mdx": () => import("../content/docs/api-reference/cli.mdx?collection=docs"), "concepts/a2a-protocol.mdx": () => import("../content/docs/concepts/a2a-protocol.mdx?collection=docs"), "concepts/agents.mdx": () => import("../content/docs/concepts/agents.mdx?collection=docs"), "concepts/registry.mdx": () => import("../content/docs/concepts/registry.mdx?collection=docs"), "concepts/security.mdx": () => import("../content/docs/concepts/security.mdx?collection=docs"), "guides/building-agents.mdx": () => import("../content/docs/guides/building-agents.mdx?collection=docs"), "guides/deployment.mdx": () => import("../content/docs/guides/deployment.mdx?collection=docs"), "guides/quickstart.mdx": () => import("../content/docs/guides/quickstart.mdx?collection=docs"), "guides/testing.mdx": () => import("../content/docs/guides/testing.mdx?collection=docs"), "resources/contributing.mdx": () => import("../content/docs/resources/contributing.mdx?collection=docs"), "resources/faq.mdx": () => import("../content/docs/resources/faq.mdx?collection=docs"), "tutorials/chat-agent.mdx": () => import("../content/docs/tutorials/chat-agent.mdx?collection=docs"), "tutorials/first-agent.mdx": () => import("../content/docs/tutorials/first-agent.mdx?collection=docs"), "tutorials/orchestration.mdx": () => import("../content/docs/tutorials/orchestration.mdx?collection=docs"), "tutorials/task-automation.mdx": () => import("../content/docs/tutorials/task-automation.mdx?collection=docs"), }),
};
export default browserCollections;