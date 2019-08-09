/* global d3 _ jLouvain window document */
/* eslint-disable newline-per-chained-call */

import ticked from './ticked';
import dragstarted from './dragstarted';
import dragged from './dragged';
import dragended from './dragended';
import drawText from './drawText';

export default function render(props) {
  //
  // configuration
  //

  const selector = props.selector;
  const inputData = props.data;
  const options = props.options;

  // const parent = d3.select(selector).nodes()[0];
  const parent = document.getElementById('graph');
  const parentWidth = parent.innerWidth || parent.clientWidth || 600;
  const parentHeight = parent.innerHeight || parent.clientHeight || 600;
  console.log('parent', parent);
  console.log('parent.scrollWidth', parent.scrollWidth);
  console.log('parentWidth', parentWidth);
  console.log('parentHeight', parentHeight);

  const width = parentWidth;
  const height = parentHeight;
  console.log('width', width);
  console.log('height', height);

  const linkWeightThreshold = 0.79;
  const soloNodeLinkWeightThreshold = 0.1;
  const labelTextScalingFactor = 28;

  // separation between same-color circles
  const padding = 9; // 1.5

  // separation between different-color circles
  const clusterPadding = 48; // 6

  const maxRadius = 12;

  const z = d3.scaleOrdinal(d3.schemeCategory20);

  // determines if nodes and node labels size is fixed
  // defaults to `undefined`
  const fixedNodeSize = options.fixedNodeSize;
  const defaultNodeRadius = '9px';

  //
  //
  //

  const svg = d3
    .select(selector)
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  const backgroundRect = svg
    .append('rect')
    .attr('width', width)
    .attr('height', height)
    .classed('background', true)
    .style('fill', 'white');

  const linkWidthScale = d3
    .scalePow()
    .exponent(2)
    .domain([0, 1])
    .range([0, 5]);

  // http://colorbrewer2.org/?type=qualitative&scheme=Paired&n=12
  const boldAlternating12 = [
    '#1f78b4',
    '#33a02c',
    '#e31a1c',
    '#ff7f00',
    '#6a3d9a',
    '#b15928',
    '#a6cee3',
    '#b2df8a',
    '#fb9a99',
    '#fdbf6f',
    '#cab2d6',
    '#ffff99'
  ];

  const gephiSoftColors = [
    '#81e2ff', // light blue
    '#b9e080', // light green
    '#ffaac2', // pink
    '#ffc482', // soft orange
    '#efc4ff', // soft violet
    '#a6a39f', // smoke gray
    '#80deca', // teal
    '#e9d9d8' // pink gray
  ];

  const textMainGray = '#635F5D';

  const color = d3.scaleOrdinal().range(boldAlternating12);

  //
  // data-driven code starts here
  //

  const graph = inputData;
  const nodes = _.cloneDeep(graph.nodes);
  const links = _.cloneDeep(graph.edges);

  // total number of nodes
  const n = nodes.length;

  const staticLinks = graph.edges;
  const linksAboveThreshold = [];
  staticLinks.forEach(d => {
    if (d.weight > linkWeightThreshold) {
      linksAboveThreshold.push(d);
    }
  });
  const linksForCommunityDetection = linksAboveThreshold;

  const nodesAboveThresholdSet = d3.set();
  linksAboveThreshold.forEach(d => {
    nodesAboveThresholdSet.add(d.source);
    nodesAboveThresholdSet.add(d.target);
  });
  const nodesAboveThresholdIds = nodesAboveThresholdSet
    .values()
    .map(d => Number(d));
  const nodesForCommunityDetection = nodesAboveThresholdIds;

  //
  // manage threshold for solo nodes
  //

  const linksAboveSoloNodeThreshold = [];
  staticLinks.forEach(d => {
    if (d.weight > soloNodeLinkWeightThreshold) {
      linksAboveSoloNodeThreshold.push(d);
    }
  });
  const nodesAboveSoloNodeThresholdSet = d3.set();
  linksAboveSoloNodeThreshold.forEach(d => {
    nodesAboveSoloNodeThresholdSet.add(d.source);
    nodesAboveSoloNodeThresholdSet.add(d.target);
  });
  const soloNodesIds = nodesAboveSoloNodeThresholdSet
    .values()
    .map(d => Number(d));

  //
  //
  //

  console.log('nodes', nodes);
  console.log('nodesAboveThresholdIds', nodesAboveThresholdIds);
  console.log('nodesForCommunityDetection', nodesForCommunityDetection);
  console.log('staticLinks', staticLinks);
  console.log('linksAboveThreshold', linksAboveThreshold);
  console.log('linksForCommunityDetection', linksForCommunityDetection);

  //
  // calculate degree for each node
  // where `degree` is the number of links
  // that a node has
  //

  nodes.forEach(d => {
    d.inDegree = 0;
    d.outDegree = 0;
  });
  links.forEach(d => {
    nodes[d.source].outDegree += 1;
    nodes[d.target].inDegree += 1;
  });

  //
  // calculate the linkWeightSums for each node
  //
  nodes.forEach(d => {
    d.linkWeightSum = 0;
  });
  links.forEach(d => {
    nodes[d.source].linkWeightSum += d.weight;
    nodes[d.target].linkWeightSum += d.weight;
  });

  //
  // detect commnunities
  //

  const communityFunction = jLouvain()
    .nodes(nodesForCommunityDetection)
    .edges(linksForCommunityDetection);

  const communities = communityFunction();
  console.log('clusters (communities) detected by jLouvain', communities);

  //
  // add community and radius properties to each node
  //

  const defaultRadius = 10;
  nodes.forEach(function(node) {
    node.r = defaultRadius;
    node.cluster = communities[node.id];
  });

  //
  // collect clusters from nodes
  //

  const clusters = {};
  nodes.forEach(node => {
    const radius = node.r;
    const clusterID = node.cluster;
    if (!clusters[clusterID] || radius > clusters[clusterID].r) {
      clusters[clusterID] = node;
    }
  });
  console.log('clusters', clusters);

  //
  // now we draw elements on the page
  //

  const link = svg
    .append('g')
    .style('stroke', '#aaa')
    .selectAll('line')
    .data(links)
    .enter()
    .append('line')
    .style('stroke-width', d => linkWidthScale(d.weight))
    .style('stroke-opacity', 0.4);

  link.attr('class', 'link').attr('marker-end', 'url(#end-arrow)');

  const nodesParentG = svg.append('g').attr('class', 'nodes');

  const node = nodesParentG
    .selectAll('.node')
    .data(nodes)
    .enter()
    .append('g')
    .classed('node', true)
    .attr('id', d => `node${d.id}`);

  const nodeRadiusScale = d3
    .scaleLinear()
    .domain([0, nodes.length])
    .range([5, 30]);

  const backgroundNode = node
    .append('circle')
    .attr('r', d => {
      if (typeof fixedNodeSize !== 'undefined') {
        return `${defaultRadius}px`;
      }
      // return `${nodeRadiusScale(d.inDegree)}px`
      return `${nodeRadiusScale(d.linkWeightSum)}px`;
    })
    .classed('background', true);

  const nodeCircle = node
    .append('circle')
    .attr('r', d => {
      if (typeof fixedNodeSize !== 'undefined') {
        return `${defaultRadius}px`;
      }
      // return `${nodeRadiusScale(d.inDegree)}px`
      return `${nodeRadiusScale(d.linkWeightSum)}px`;
    })
    .on('mouseover', fade(0.1))
    // .on('mouseout', fade(0.4))
    .classed('mark', true);

  // draw labels
  const label = node
    .append('text')
    .text(d => d.name)
    .style('font-size', function(d) {
      if (typeof fixedNodeSize !== 'undefined') {
        return `${defaultRadius * 1}px`;
      }
      return `${Math.max(
        Math.min(
          2 * nodeRadiusScale(d.linkWeightSum),
          (2 * nodeRadiusScale(d.linkWeightSum) - 8) /
            this.getComputedTextLength() *
            labelTextScalingFactor
        ),
        // Math.min(
        //   2 * nodeRadiusScale(d.inDegree),
        //   (2 * nodeRadiusScale(d.inDegree) - 8) / this.getComputedTextLength() * labelTextScalingFactor
        // ),
        8
      )}px`;
    })
    .style('fill', '#666')
    .style('fill-opacity', 1)
    .style('pointer-events', 'none')
    .style('stroke', 'none')
    .attr('class', 'label')
    .attr('dx', function(d) {
      const dxValue = `${-1 * (this.getComputedTextLength() / 2)}px`;
      return dxValue;
    })
    .attr('dy', '.35em');

  const linkedByIndex = {};
  linksAboveSoloNodeThreshold.forEach(d => {
    // console.log('d from linkedByIndex creation', d);
    linkedByIndex[`${d.source},${d.target}`] = true;
  });
  console.log('linkedByIndex', linkedByIndex);

  // click on the background to reset the fade
  // to show all nodes
  backgroundRect.on('click', resetFade());

  const boundTicked = ticked.bind(
    this,
    link,
    soloNodesIds,
    textMainGray,
    color,
    communities,
    node,
    backgroundNode,
    node
  );

  const simulation = d3
    .forceSimulation()
    .nodes(nodes)
    .force('link', d3.forceLink().id(d => d.id))
    .velocityDecay(0.2)
    .force('x', d3.forceX().strength(0.0005))
    .force('y', d3.forceY().strength(0.0005))
    .force('collide', collide)
    .force('cluster', clustering)
    .force('charge', d3.forceManyBody().strength(-1200))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .on('tick', boundTicked);

  simulation.force('link').links(links);

  const boundDragstarted = dragstarted.bind(this, simulation);
  const boundDragended = dragended.bind(this, simulation);

  node.call(
    d3
      .drag()
      .on('start', boundDragstarted)
      .on('drag', dragged)
      .on('end', boundDragended)
  );

  // draw the help text for the main network plot
  drawText({
    selector: 'svg',
    text: `mouse over a node to see it's relationships. click the background to reset.`,
    xOffset: 75,
    yOffset: 10
  });

  d3
    .select('body')
    .append('svg')
    .attr('height', 100)
    .attr('width', 960)
    .attr('class', 'sliderTextSVG');

  // draw the help text for the slider
  drawText({
    selector: '.sliderTextSVG',
    text: `slide to increase the correlation threshold -->`,
    xOffset: 115,
    yOffset: 40
  });

  d3
    .select('div#graph')
    .append('div')
    .attr('id', 'slider-container');

  // draw the slider control
  drawSliderControl({
    selector: 'div#slider-container',
    padding: '10px',
    defaultLinkOpacity: 0.4,
    defaultMarkOpacity: 0.4,
    defaultLabelOpacity: 1
  });

  //
  // implement custom forces for clustering communities
  //

  function clustering(alpha) {
    nodes.forEach(d => {
      const cluster = clusters[d.cluster];
      if (cluster === d) return;
      let x = d.x - cluster.x;
      let y = d.y - cluster.y;
      let l = Math.sqrt(x * x + y * y);
      const r = d.r + cluster.r;
      if (l !== r) {
        l = (l - r) / l * alpha;
        d.x -= x *= l;
        d.y -= y *= l;
        cluster.x += x;
        cluster.y += y;
      }
    });
  }

  function collide(alpha) {
    const quadtree = d3
      .quadtree()
      .x(d => d.x)
      .y(d => d.y)
      .addAll(nodes);

    nodes.forEach(d => {
      const r = d.r + maxRadius + Math.max(padding, clusterPadding);
      const nx1 = d.x - r;
      const nx2 = d.x + r;
      const ny1 = d.y - r;
      const ny2 = d.y + r;
      quadtree.visit((quad, x1, y1, x2, y2) => {
        if (quad.data && quad.data !== d) {
          let x = d.x - quad.data.x;
          let y = d.y - quad.data.y;
          let l = Math.sqrt(x * x + y * y);
          const r =
            d.r +
            quad.data.r +
            (d.cluster === quad.data.cluster ? padding : clusterPadding);
          if (l < r) {
            l = (l - r) / l * alpha;
            d.x -= x *= l;
            d.y -= y *= l;
            quad.data.x += x;
            quad.data.y += y;
          }
        }
        return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
      });
    });
  }

  //
  //
  //

  function isConnected(a, b) {
    return (
      isConnectedAsTarget(a, b) ||
      isConnectedAsSource(a, b) ||
      a.index === b.index
    );
  }

  function isConnectedAsSource(a, b) {
    return linkedByIndex[`${a.index},${b.index}`];
  }

  function isConnectedAsTarget(a, b) {
    return linkedByIndex[`${b.index},${a.index}`];
  }

  function isEqual(a, b) {
    return a.index === b.index;
  }

  function fade(opacity) {
    return d => {
      node.style('stroke-opacity', function(o) {
        // console.log('o from fade node.style', o);
        // console.log('isConnected(d, o)', isConnected(d, o));
        // const thisOpacity = isConnected(d, o) ? defaultOpacity : opacity;
        // console.log('thisOpacity from fade node.style', thisOpacity);
        // console.log('this from fade node.style', this);

        // style the mark circle
        // console.log('this.id', this.id);
        // this.setAttribute('fill-opacity', thisOpacity);
        const defaultMarkOpacity = 0.4;
        d3
          .select(`#${this.id}`)
          .selectAll('.mark')
          .style('fill-opacity', p => {
            // console.log('p from fade mark', p);
            // console.log('isConnected(d, p) mark', isConnected(d, p));
            const markOpacity = isConnected(d, p)
              ? defaultMarkOpacity
              : opacity;
            // console.log('markOpacity', markOpacity);
            return markOpacity;
          });

        // style the label text
        const defaultLabelOpacity = 1;
        d3
          .select(`#${this.id}`)
          .selectAll('.label')
          .style('fill-opacity', p => {
            // console.log('p from fade label', p);
            // console.log('isConnected(d, p) label', isConnected(d, p));
            let labelOpacity = 1;
            if (!isConnected(d, p) && opacity !== defaultMarkOpacity) {
              labelOpacity = opacity;
            }
            // console.log('labelOpacity', labelOpacity);
            return labelOpacity;
          });

        return 1;
      });

      // style the link lines
      const defaultLinkOpacity = 0.4;
      link.style('stroke-opacity', o => {
        // console.log('o from fade link style', o);
        // console.log('d from fade link style', d);
        if (o.source.id === d.id || o.target.id === d.id) {
          return defaultLinkOpacity;
        }
        return opacity;
      });
      link.attr('marker-end', o => {
        if (
          opacity === defaultLinkOpacity ||
          o.source.id === d.id ||
          o.target.id === d.id
        ) {
          return 'url(#end-arrow)';
        }
        return 'url(#end-arrow-fade)';
      });
    };
  }

  function resetFade() {
    return () => {
      console.log('resetFade function was called');
      // reset marks
      const defaultMarkOpacity = 0.4;
      d3
        .select(selector)
        .selectAll('.mark')
        .style('fill-opacity', defaultMarkOpacity);

      // reset labels
      const defaultLabelOpacity = 1;
      d3
        .select(selector)
        .selectAll('.label')
        .style('fill-opacity', defaultLabelOpacity);

      // reset links
      const defaultLinkOpacity = 0.4;
      d3
        .select(selector)
        .selectAll('.link')
        .style('stroke-opacity', defaultLinkOpacity);
    };
  }

  /* global d3 */
  function drawSliderControl(props) {
    var selector = props.selector;
    var padding = props.padding;
    var defaultMarkOpacity = props.defaultMarkOpacity;
    var defaultLinkOpacity = props.defaultLinkOpacity;
    var defaultLabelOpacity = props.defaultLabelOpacity;

    d3
      .select(selector)
      .append('input')
      .attr('type', 'range')
      .attr('min', 0)
      .attr('max', 1)
      .attr('value', 0.356)
      .attr('step', 0.001)
      .style('top', '604px')
      .style('left', '90px')
      .style('height', '36px')
      .style('width', '450px')
      .style('position', 'fixed')
      .attr('id', 'slider');

    d3.select('#slider').on('input', function() {
      update(+this.value);
    });

    function update(sliderValue) {
      console.log('sliderValue', sliderValue);
      // adjust the text on the range slider
      d3.select('#nRadius-value').text(sliderValue);
      d3.select('#nRadius').property('value', sliderValue);

      d3.selectAll('.link').style('stroke-opacity', function(d) {
        // console.log('d from slider update', d);
        if (d.weight < sliderValue) {
          return 0;
        }
        return defaultLinkOpacity;
      });

      // fade marks below the threshold
      d3.selectAll('.mark').style('fill-opacity', function(d) {
        // first style the label associated with the mark
        // console.log('d from mark selection', d);
        d3
          .select('#node' + d.id)
          .selectAll('.label')
          .style('fill-opacity', function() {
            if (d.maxLinkWeight < sliderValue) {
              return 0.1;
            }
            return defaultLabelOpacity;
          });

        // then style the mark itself
        if (d.maxLinkWeight < sliderValue) {
          return 0.1;
        }
        return defaultMarkOpacity;
      });

      // if there is a pictogram table on the page
      if (d3.select('.pictogramTable').nodes().length > 0) {
        // fade table text for rows below the threshold
        d3.select('.pictogramTable').selectAll('tr').style('color', function(d) {
          // first style the label associated with the mark
          // console.log('d from span selection', d);
          if (d.weight < sliderValue) {
            return '#CCC';
          }
          return 'black';
        });
      }
    }
  }
}
