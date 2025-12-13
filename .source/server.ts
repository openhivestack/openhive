// @ts-nocheck
import { default as __fd_glob_14 } from "../content/docs/meta.json?collection=meta"
import * as __fd_glob_13 from "../content/docs/tutorials/task-automation.mdx?collection=docs"
import * as __fd_glob_12 from "../content/docs/tutorials/orchestration.mdx?collection=docs"
import * as __fd_glob_11 from "../content/docs/tutorials/first-agent.mdx?collection=docs"
import * as __fd_glob_10 from "../content/docs/tutorials/chat-agent.mdx?collection=docs"
import * as __fd_glob_9 from "../content/docs/registry/self-hosting.mdx?collection=docs"
import * as __fd_glob_8 from "../content/docs/registry/security.mdx?collection=docs"
import * as __fd_glob_7 from "../content/docs/registry/protocol.mdx?collection=docs"
import * as __fd_glob_6 from "../content/docs/registry/overview.mdx?collection=docs"
import * as __fd_glob_5 from "../content/docs/registry/architecture.mdx?collection=docs"
import * as __fd_glob_4 from "../content/docs/guides/testing.mdx?collection=docs"
import * as __fd_glob_3 from "../content/docs/guides/quickstart.mdx?collection=docs"
import * as __fd_glob_2 from "../content/docs/guides/deployment.mdx?collection=docs"
import * as __fd_glob_1 from "../content/docs/guides/building-agents.mdx?collection=docs"
import * as __fd_glob_0 from "../content/docs/index.mdx?collection=docs"
import { server } from 'fumadocs-mdx/runtime/server';
import type * as Config from '../source.config';

const create = server<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>({"doc":{"passthroughs":["extractedReferences"]}});

export const docs = await create.doc("docs", "content/docs", {"index.mdx": __fd_glob_0, "guides/building-agents.mdx": __fd_glob_1, "guides/deployment.mdx": __fd_glob_2, "guides/quickstart.mdx": __fd_glob_3, "guides/testing.mdx": __fd_glob_4, "registry/architecture.mdx": __fd_glob_5, "registry/overview.mdx": __fd_glob_6, "registry/protocol.mdx": __fd_glob_7, "registry/security.mdx": __fd_glob_8, "registry/self-hosting.mdx": __fd_glob_9, "tutorials/chat-agent.mdx": __fd_glob_10, "tutorials/first-agent.mdx": __fd_glob_11, "tutorials/orchestration.mdx": __fd_glob_12, "tutorials/task-automation.mdx": __fd_glob_13, });

export const meta = await create.meta("meta", "content/docs", {"meta.json": __fd_glob_14, });