<script lang="ts">
  import { afterUpdate, createEventDispatcher, onDestroy, onMount, } from "svelte";
  import Sigma from "sigma";
  import FA2Layout from "graphology-layout-forceatlas2/worker";
  import forceAtlas2 from "graphology-layout-forceatlas2";
  import type Graph from "graphology";
  import type { SigmaNodeEventPayload } from "sigma/sigma";
  import type { Attributes } from "graphology-types";
  import type { EdgeDisplayData, NodeDisplayData, PartialButFor } from "sigma/types";
  import { Mode, settings } from "./stores";
  import { adamicAdar, coCitation, ResultMap } from "./analysis";
  import { shortestPathDirected, shortestPathEdgePredicate, shortestPathUndirected, } from "./shortestPath";
  import { nodeNameIndex } from "./graph";

  import CircleNodeProgram from "sigma/rendering/webgl/programs/node.fast";
  import getNodeProgramImage from "sigma/rendering/webgl/programs/node.image";
  import drawLabel from "sigma/rendering/canvas/label";
  import type { Settings } from "sigma/settings";

  export let graph: Graph;

  let sigmaRef: HTMLElement;
  let sigma: Sigma | undefined;
  let fa2Layout: FA2Layout | undefined;

  const dispatch = createEventDispatcher();

  const white = "#ffffff";
  const red = "#f87171";
  const orange = "#fb923c";
  const grey = "#777777";
  const labelColor = "#cccccc";
  const backgroundColor = "#212123";

  function drawHover(
    context: CanvasRenderingContext2D,
    data: PartialButFor<NodeDisplayData, "x" | "y" | "size" | "label" | "color">,
    settings: Settings,
  ): void {
    const size = settings.labelSize, font = settings.labelFont, weight = settings.labelWeight;
    context.font = `${weight} ${size}px ${font}`;
    context.fillStyle = backgroundColor;
    context.shadowColor = white;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
    context.shadowBlur = 8;

    const PADDING = 2;
    const textWidth = context.measureText(data.label).width,
      boxWidth = Math.round(textWidth + 5),
      boxHeight = Math.round(size + 2 * PADDING),
      radius = Math.max(data.size, size / 2) + PADDING;
    const angleRadian = Math.asin(boxHeight / 2 / radius);
    const xDeltaCoord = Math.sqrt(Math.abs(Math.pow(radius, 2) - Math.pow(boxHeight / 2, 2)));
    context.beginPath();
    context.moveTo(data.x + xDeltaCoord, data.y + boxHeight / 2);
    context.lineTo(data.x + radius + boxWidth, data.y + boxHeight / 2);
    context.lineTo(data.x + radius + boxWidth, data.y - boxHeight / 2);
    context.lineTo(data.x + xDeltaCoord, data.y - boxHeight / 2);
    context.arc(data.x, data.y, radius, angleRadian, -angleRadian);
    context.closePath();
    context.fill();

    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
    context.shadowBlur = 0;

    drawLabel(context, data, settings);
  }

  onMount(async () => {
    sigma = new Sigma(graph, sigmaRef, {
      allowInvalidContainer: true,
      nodeReducer,
      edgeReducer,
      defaultNodeColor: grey,
      defaultEdgeColor: grey,
      labelColor: { color: labelColor },
      hoverRenderer: drawHover,
      nodeProgramClasses: {
        circle: CircleNodeProgram,
        image: getNodeProgramImage(),
      }
    });
    sigma.on("clickNode", handleNodeClick);
    if ($settings.cameraState) {
      sigma.getCamera().setState($settings.cameraState);
    }
    let threshold = $settings.labelThreshold
    sigma.setSetting("labelRenderedSizeThreshold", threshold)
  });

  afterUpdate(() => {
    if (sigma) {
      sigma.refresh();
      if (fa2Layout) {
        fa2Layout.kill();
      }
      const sensibleSettings = forceAtlas2.inferSettings(graph);
      sensibleSettings.gravity = $settings.gravity;
      fa2Layout = new FA2Layout(graph, {
        settings: sensibleSettings,
      });
      fa2Layout.start();
    }
  });

  onDestroy(async () => {
    if (fa2Layout) {
      fa2Layout.kill();
      fa2Layout = undefined;
    }
    if (sigma) {
      $settings.cameraState = sigma.getCamera().getState();
      sigma.kill();
      sigma = undefined;
    }
  });

  const handleNodeClick = async ({ node }: SigmaNodeEventPayload) => {
    dispatch("nodeclick", node);
  };

  const maxSize = (size: number, max: number) => {
    if (size > max) {
      return max;
    } else {
      return size;
    }
  };

  const nodeReducer = (node: string, data: Attributes) => {
    const res: Partial<NodeDisplayData> = { ...data };
    if ($settings.size === "in") {
      res.size = maxSize(Math.max(2, graph.neighbors(node).length / 2), 16);
    } else if ($settings.size === "out") {
      res.size = maxSize(graph.inDegree(node), 16);
    }

    const label = res.label?.toUpperCase();
    const search = $settings.search?.toUpperCase();

    if (
      !$settings.filter &&
      search &&
      label &&
      (label.includes(search) ||
        data["aliases"]?.find((a: string) => a.includes(search)))
    ) {
      res.color = orange;
      res.size = (res.size ?? data.size) + 2;
      res.highlighted = true;
    }

    if ($settings.mode === Mode.ShortestPath) {
      const pathA =
        $settings.pathA && nodeIndex?.get($settings.pathA.toUpperCase());
      const pathB =
        $settings.pathB && nodeIndex?.get($settings.pathB.toUpperCase());

      if (
        shortestNodePath?.includes(node) ||
        node === pathA ||
        node === pathB
      ) {
        res.color = red;
        res.zIndex = 2;
        res.highlighted = true;
      } else {
        res.zIndex = -1;
      }
    }

    if ($settings.mode === Mode.AdamicAdar && adamicAdarResults) {
      const pathA =
        $settings.pathA && nodeIndex?.get($settings.pathA.toUpperCase());
      if (pathA && node === pathA) {
        res.size = 10;
        res.zIndex = 2;
        res.color = orange;
        res.highlighted = true;
      } else if (adamicAdarResults[node]) {
        res.color = red;
        res.size = maxSize(
          $settings.bubbleSize * adamicAdarResults[node].measure,
          32
        );
        res.label = `${adamicAdarResults[node].measure} ${data.label}`;
      }
    }
    if ($settings.mode === Mode.CoCitation && coCitationResults) {
      const pathA =
        $settings.pathA && nodeIndex?.get($settings.pathA.toUpperCase());
      if (pathA && node === pathA) {
        res.size = 10;
        res.zIndex = 2;
        res.color = orange;
        res.highlighted = true;
      } else if (coCitationResults[node]) {
        res.color = red;
        res.size = $settings.bubbleSize * coCitationResults[node].measure;
        res.label = `${coCitationResults[node].measure} ${data.label}`;
      }
    }

    return res;
  };

  let shortestNodePath: Array<string> | undefined | null;
  let shortestEdgePath: Array<string> | undefined | null;
  let adamicAdarResults: ResultMap | undefined;
  let nodeIndex: Map<string, string> | undefined;
  let coCitationResults: any;

  $: if (sigma) {
    nodeIndex = nodeNameIndex(sigma.getGraph());
  }

  $: if (
    sigma &&
    $settings.mode === Mode.ShortestPath &&
    $settings.pathA &&
    $settings.pathB
  ) {
    const graph = sigma.getGraph();
    const results = $settings.directed
      ? shortestPathDirected(graph, $settings.pathA, $settings.pathB)
      : shortestPathUndirected(graph, $settings.pathB, $settings.pathA);
    shortestNodePath = results.nodes;
    shortestEdgePath = results.edges;
  } else {
    shortestNodePath = undefined;
    shortestEdgePath = undefined;
  }

  $: if (sigma && $settings.mode === Mode.AdamicAdar && $settings.pathA) {
    const graph = sigma.getGraph();
    const pathA =
      $settings.pathA && nodeIndex?.get($settings.pathA.toUpperCase());
    if (pathA) {
      adamicAdarResults = adamicAdar(graph, pathA);
      console.log(adamicAdarResults);
    } else {
      adamicAdarResults = undefined;
    }
  } else {
    adamicAdarResults = undefined;
  }

  $: if (sigma && $settings.mode === Mode.CoCitation && $settings.pathA) {
    const pathA = nodeIndex?.get($settings.pathA.toUpperCase());
    if (pathA) {
      (async () =>
        (coCitationResults = await coCitation(
          sigma.getGraph(),
          pathA,
        )))();
    } else {
      coCitationResults = undefined;
    }
  } else {
    coCitationResults = undefined;
  }

  const edgeReducer = (edge: string, data: Attributes) => {
    const res: Partial<EdgeDisplayData> = { ...data };
    if (
      sigma &&
      $settings.mode === Mode.ShortestPath &&
      shortestPathEdgePredicate(shortestEdgePath, edge)
    ) {
      res.color = red;
      res.size = 5;
    }
    return res;
  };
</script>

<div class="sigma" bind:this={sigmaRef}/>

<style>
    .sigma {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
    }
</style>
