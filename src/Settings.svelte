<script lang='ts'>
  import { graph, Mode, settings, store } from './stores';

  function handleShortestPathClear() {
    $settings.pathA = undefined;
    $settings.pathB = undefined;
  }

  function handleShortestPathRandom() {
    if ($graph) {
      $graph.then((graph) => {
        const nodes = graph.nodes().filter((node) => graph.degree(node));
        const pathA = nodes[Math.floor(Math.random() * nodes.length)];
        let pathB;
        if (nodes.length < 2) {
          pathB = pathA;
        } else {
          do {
            pathB = nodes[Math.floor(Math.random() * nodes.length)];
          } while (pathA === pathB);
        }
        if (pathA) {
          $settings.pathA = graph.getNodeAttribute(pathA, 'label');
        }
        if (pathB) {
          $settings.pathB = graph.getNodeAttribute(pathB, 'label');
        }
      });
    }
  }
</script>

<div class='settings'>
  <div>
    <label for='search'>Search</label>
    <input type='text' id='search' bind:value={$settings.search} />
  </div>
  <div>
    <label for='filter'>Filter</label>
    <input type='checkbox' id='filter' bind:checked={$settings.filter} />
    <label for='filter'></label>
  </div>
  <div>
    <label for='journal'>Journal</label>
    <input type='checkbox' id='journal' bind:checked={$settings.journal} on:change={store.reload} />
    <label for='journal'></label>
  </div>
  <div>
    <label for='labelThreshold'>Label Threshold</label>
    <input
      type='range'
      id='labelThreshold'
      min='0'
      step='0.05'
      max='10'
      bind:value={$settings.labelThreshold}
    />
  </div>
  {#if $settings.filter}
    <div>
      <label for='hops'>Hops</label>
      <input
        type='range'
        id='hops'
        min='1'
        step='1'
        max='10'
        bind:value={$settings.filterLength}
      />
    </div>
  {/if}
  <div>
    <label for='size'>Size</label>
    <select id='size' name='size' bind:value={$settings.size}>
      <option selected value='in'>Inbound</option>
      <option value='out'>Outbound</option>
    </select>
  </div>
  <div>
    <label for='mode'>Mode</label>
    <select id='mode' bind:value={$settings.mode}>
      {#each Object.entries(Mode) as [key, val]}
        <option value={val}>{val}</option>
      {/each}
    </select>
  </div>
  {#if $settings.mode === Mode.ShortestPath}
    <div style='padding-top: 5px'>
      <input type='submit' value='clear' on:click={handleShortestPathClear} />
      <input type='submit' value='random' on:click={handleShortestPathRandom} />
    </div>
    <div>
      <label for='directed'>Direct</label>
      <input type='checkbox' id='directed' bind:checked={$settings.directed} />
      <label for='directed'></label>
    </div>
    <div>
      <label for='pathA'>Path A</label>
      <input type='text' id='pathA' bind:value={$settings.pathA} />
    </div>
    <div>
      <label for='pathB'>Path B</label>
      <input type='text' id='pathB' bind:value={$settings.pathB} />
    </div>
  {/if}
  {#if $settings.mode === Mode.AdamicAdar || $settings.mode === Mode.CoCitation}
    <div>
      <label for='path'>Path</label>
      <input type='text' id='path' bind:value={$settings.pathA} />
    </div>
    <div>
      <label for='bubbleSize'>Bubble Size</label>
      <input
        type='range'
        id='bubbleSize'
        min='0.01'
        step='0.1'
        max='10'
        bind:value={$settings.bubbleSize}
      />
    </div>
  {/if}
</div>

<style>
    .settings {
        position: fixed;
        top: 40px;
        right: 1vh;
        display: flex;
        flex-direction: column;
        border: 1px solid #cccccc;
        padding: 7px 10px;
        margin: 0;
        background-color: #212123;
    }

    .settings > div {
        padding: 3px 0;
    }

    .settings label {
        margin-right: 2px;
    }

    .settings label,
    .settings select,
    .settings input[type="submit"],
    .settings input[type="range"] {
        cursor: pointer;
    }

    .settings input[type="text"],
    .settings select,
    .settings input[type="submit"] {
        position: relative;
        bottom: 1px;
        border: 1px solid #cccccc;
        color: #cccccc;
        background-color: #212123;
    }

    .settings input[type="checkbox"] {
        display: none;
    }

    .settings input[type="checkbox"] + label {
        display: inline-block;
        position: relative;
        top: 2px;
        width: 14px;
        height: 14px;
        border: 1px solid #cccccc;
        background-color: #212123;
    }

    .settings input[type="checkbox"]:checked + label {
        border: 1px solid #212123;
        background-color: #cccccc;
    }

    .settings input[type="text"]:hover,
    .settings select:hover,
    .settings input[type="submit"]:hover,
    .settings input[type="checkbox"] + label:hover {
        background-color: #313133;
    }

    .settings input[type="checkbox"]:checked + label:hover {
        border: 1px solid #212123;
        background-color: #bcbcbc;
    }

    .settings input[type="range"] {
        position: relative;
        top: 2px;
        accent-color: #cccccc;
    }
</style>
