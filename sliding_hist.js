function sliding_hist() {
  var chartWidth  = 960, // default width
      chartHeight = 500, // default height
      binWidth    = 10,
      stepWidth   = 1,
      fillColor   = "steelblue"

    //Need last element of array later, neater to define logic here.
    Array.prototype.last = function() {
      return this[this.length-1];
    }

    //takes your data, bin width and how much the bin slides over each step and
    //returns an array of objects containing the "center" of the bin and the number
    //of elements that fell in it ("in_bin").
    function generate_slide_hist(data, binWidth, stepSize){
        var binHalf = binWidth/2;

        //Find the range of the data so we can know which window to slide overlay
        var data_range = d3.extent(data)

        //generate an array of the bin centers we are going to use in our sliding interval.
        var bin_centers = [data_range[0] ]
        while(bin_centers.last() < data_range[1]) bin_centers.push(bin_centers.last() + stepSize)

        //Run through the bin centers counting how many are within the bin width of the value.
        var counts = []
        bin_centers.forEach(function(center){
            var points_in_bin = data.filter(function(val){return val > (center - binHalf) &&  val < (center + binHalf) })
            counts.push({"center": center, "in_bin": points_in_bin.length})
        })

      return counts;
    }

  function chart(selection) {
      selection.each(function(data){

          //make into the correct form.
          var hist_data = generate_slide_hist(data,binWidth,stepWidth);

          var margin = {top: 20, right: 20, bottom: 30, left: 50},
              width  = chartWidth - margin.left - margin.right,
              height = chartHeight - margin.top - margin.bottom;

          var dataRange = d3.extent(data)
          var x = d3.scaleLinear()
              .range([0, width])
              .domain(dataRange);

          var y = d3.scaleLinear()
              .range([height, 0])
              .domain([0,d3.max(hist_data, function(d) { return d.in_bin; })]);

          var line = d3.line()
              .x(function(d) { return x(d.center); })
              .y(function(d) { return y(d.in_bin); });

          //shade under the line like a proper histogram.
          var area = d3.area()
               .x(function(d) { return x(d.center); })
               .y0(height)
               .y1(function(d) { return y(d.in_bin); });

          var svg = d3.select(this).append("svg")
              .attr("width",  width  + margin.left + margin.right)
              .attr("height", height + margin.top  + margin.bottom)
            .append("g")
              .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

          //shade under the line.
          svg.append("path")
            .datum(hist_data)
            .attr("class", "area")
            .style("fill", fillColor)
            .style("fill-opacity", 0.5)
            .attr("d", area);

          svg.append("path")
            .datum(hist_data)
            .attr("class", "line")
            .attr("d", line);

          svg.append("g")
              .attr("class", "axis axis--x")
              .attr("transform", "translate(0," + height + ")")
              .call(d3.axisBottom(x));

          svg.append("g")
              .attr("class", "axis axis--y")
              .call(d3.axisLeft(y))
              .append("text")
                  .attr("class", "axis-title")
                  .attr("transform", "rotate(-90)")
                  .attr("y", 6)
                  .attr("dy", ".71em")
                  .style("text-anchor", "end")
                  .text("# in x +- binwidth/2");

          var focus = svg.append("g")
              .attr("class", "focus")
              .style("display", "none");

          focus.append("circle")
            .attr("r", 4.5)
            .style("fill", "none")
            .style("stroke", "black");

          var drop_line = focus.append("line")
              .attr("x1", 0)
              .attr("y1", 0)
              .attr("x2", 0)
              .attr("y2", 0)
              .attr("stroke","black");

        //how many pixles the interval takes up on the screen.
        var interval_width = x(dataRange[0] + binWidth/2);

        var interval_line = svg.append("g")
            .attr("class", "interval_line")

        //where the interval legend sits on plot when not being used for mouseover.
        var interval_rest = "translate(" + (width - interval_width - 20) + "," + (height/7) + ")"

        //place the interval line as a legend when not being interacted with.
        interval_line.attr("transform", interval_rest);

        var interval_legend_text = svg.append("text")
            .text("Bin Width: " + binWidth)
            .attr("text-anchor", "middle")
            .attr("font-size", "0.9em")
            .attr("y", -14)
            .attr("transform", interval_rest);

        interval_line.append("line")
            .attr("class", "wide_line")
            .attr("x1", interval_width)
            .attr("y1", -10)
            .attr("x2", -interval_width)
            .attr("y2", -10)
            .attr("stroke","black")
            .attr("stroke-width","1px");

        interval_line.append("line")
            .attr("class", "left_line")
            .attr("x1", -interval_width)
            .attr("y1", 0)
            .attr("x2", -interval_width)
            .attr("y2", -10)
            .attr("stroke","black")
            .attr("stroke-width","1px");

        interval_line.append("line")
            .attr("class", "right_line")
            .attr("x1", interval_width)
            .attr("y1", 0)
            .attr("x2", interval_width)
            .attr("y2", -10)
            .attr("stroke","black")
            .attr("stroke-width","1px");

          focus.append("text")
            .attr("x", 9)
            .attr("dy", ".35em");

          svg.append("rect")
             .attr("class", "overlay")
             .attr("width", width)
             .attr("height", height)
             .style("fill","none")
             .style("pointer-events", "all")
             .on("mouseover", function() {
                 focus.style("display", null); })
             .on("mouseout",  function() {
                 interval_line.transition().duration(200).attr("transform", interval_rest);
                 focus.style("display", "none"); })
             .on("mousemove", mousemove);

           var bisectX = d3.bisector(function(d) { return d.center; }).left;

           function mousemove() {
              var x0 = x.invert(d3.mouse(this)[0]),
                  i = bisectX(hist_data, x0, 1),
                  d0 = hist_data[i - 1],
                  d1 = hist_data[i],
                  d = x0 - d0.center > d1.center - x0 ? d1 : d0;
              focus.attr("transform", "translate(" + x(d.center) + "," + y(d.in_bin) + ")");
              drop_line
                .attr("y1", 4.5)
                .attr("y2", (height - y(d.in_bin) -10));

              interval_line
                .transition()
                .duration(20)
                .attr("transform", "translate(" + x(d.center) + "," + (height ) + ")");

              focus.select("text").text(d.in_bin);
            }
      })

    }
    chart.binWidth = function(value) {
        if (!arguments.length) return binWidth;
        binWidth = value;
        return chart;
    };

    chart.stepWidth = function(value) {
        if (!arguments.length) return stepWidth;
        stepWidth = value;
        return chart;
    };

    chart.height = function(value) {
        if (!arguments.length) return chartHeight;
        chartHeight = value;
        return chart;
    };

    chart.width = function(value) {
        if (!arguments.length) return chartWidth;
        chartWidth = value;
        return chart;
    };

    chart.fillColor = function(value) {
        if (!arguments.length) return fillColor;
        fillColor = value;
        return chart;
    };

    return chart;
}
