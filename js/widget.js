;(function() {
  const script = document.currentScript;
  const OWNER = script.getAttribute('data-owner');
  const REPO  = script.getAttribute('data-repo');
  const container = document.getElementById('map-container');

  // insert & configure SVG
  const svg = d3.select(container)
    .append('svg')
      .attr('viewBox','0 0 800 450')
      .attr('preserveAspectRatio','xMidYMid slice');

  const projection = d3.geoMercator().scale(130).translate([400,225]);
  const path = d3.geoPath().projection(projection);

  // draw countries
  d3.json('https://unpkg.com/world-atlas@2/countries-110m.json')
    .then(topo => {
      const features = topojson.feature(topo, topo.objects.countries).features;
      svg.selectAll('path')
         .data(features)
         .enter().append('path')
           .attr('d', path)
           .attr('id', d => d.id);
      paint();
      setInterval(paint, 3600_000);
    });

  function paint() {
    svg.selectAll('path').classed('active', false);
    fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contributors?per_page=100`)
      .then(r => r.json())
      .then(list => {
        list.forEach(c =>
          fetch(c.url)
            .then(r => r.json())
            .then(user => {
              const loc = (user.location||'').toLowerCase();
              const names = window.i18nIsoCountries.getNames('en');
              const match = Object.entries(names)
                .find(([iso,name]) => loc.includes(name.toLowerCase()));
              if (match) svg.select(`#${match[0]}`).classed('active', true);
            })
        );
      });
  }
})();
