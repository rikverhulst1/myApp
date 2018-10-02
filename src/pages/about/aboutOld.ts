import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { NavController, LoadingController } from 'ionic-angular';
import { Chart } from 'chart.js';
import * as annotation from 'chartjs-plugin-annotation';
import 'chartjs-plugin-labels';
import {HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import 'rxjs/add/operator/map';
import moment from 'moment';

// @Component({
//   selector: 'page-about',
//   templateUrl: 'about.html'
// })

export class AboutPage implements OnInit {
    tabBarElement: any;
    constructor(private http: HttpClient, public navCtrl: NavController, public loadingCtrl: LoadingController){
        this.tabBarElement = document.querySelector('.tabbar');
    }
    //appId = "DEMO_APP";
    //apiKey = "DEMO_KEY";
    appId = "d99d33d3-8424-4510-b2df-972c70409e15";
    apiKey = "yxgrgrlhurvrmfwa54da4e5n83qia0sq0eamf3r4";
    chartsBackgroundColor = 'rgb(209, 223, 255)';
    //chartsBackgroundColor = 'rgb(0, 77, 255)';
    timespanMinutes = 720;
    intervalMinutes = 10;
    suggestedMaxChartPercent = 100;
    suggestedMaxChartValueMarge = 0;
    timeFormat: 'DD-MM-YYYY HH:mm:ss.SSS';
    charts = [];
    numberOfCharts = Array(18);
    chartsLoaded = false;
    loading = this.loadingCtrl.create({
        content: 'Bezig met laden'
    });

    ngOnInit() {
        this.numberOfCharts;
        this.tabBarElement.style.display = 'none';
        this.loading.present();
        this.loadCharts();
        this.setRefresher(10);
    }

    ionViewWillLeave() {
        this.tabBarElement.style.display = 'none';
    }
    async loadCharts() {
        // context.fillRect(0, 0, divClass.clientWidth, divClass.clientHeight);
        await this.newChart("line", "customMetrics%2F%5CLogicalDisk(_Total)%5CDisk%20Transfers%2Fsec", "totaal aantal schijftransfers per seconde", "sum");
        this.setThreshold(0, 350, true);
        await this.newChart("bar", "users/count", "aantal gebruikers", "unique");
        await this.newChart("bar", "requests/count", "totaal aantal requests", "sum");
        this.setThreshold(2, 20, true);
        await this.newChart("line", "customMetrics%2F%5CProcess(_Total)%5CIO%20Data%20Bytes%2Fsec", "gemiddelde IO Data bytes/sec", "avg");
        await this.newChart("line", "customMetrics%2F%5CProcessor%20Information(_Total)%5C%25%20Processor%20Time", "% Processortijd (gemiddeld)", "avg");
        this.setThreshold(4, 60, true, true);
        await this.newChart("line", "performanceCounters/memoryAvailableBytes", "beschikbaar geheugen (bytes, gemiddeld)", "avg");
        await this.newChart("line", "customMetrics%2F%5CSystem%5CProcesses", "Systeemprocessen (gemiddeld)", "avg");
        await this.newChart("pie", "pageViews | where  timestamp > ago("+this.timespanMinutes+"m) | summarize count() by client_CountryOrRegion", "aantal paginaweergaven per land");
        await this.newChart("pie", "pageViews | where  timestamp > ago("+this.timespanMinutes+"m) | summarize count() by name", "aantal paginaweergaven per pagina");
        await this.newChart("pie", "requests | where  timestamp > ago("+this.timespanMinutes+"m) | summarize count() by client_CountryOrRegion", "aantal requests per land");
        //await this.newChart("line", "customMetrics%2F%5CMemory%5CAvailable%20MBytes", "beschikbaar geheugen (bytes, gemiddeld)", "interval=PT"+this.intervalMinutes+"M&timespan=PT"+this.timespanMinutes+"M&aggregation=avg");
        await this.newChart("line", "customMetrics%2F%5CLogicalDisk(_Total)%5C%25%20Free%20Space", "% gemiddelde totale beschikbare schijfruimte", "avg");
        this.setThreshold(10, 21, false, true);
        await this.newChart("line", "customMetrics%2F%5CLogicalDisk(C:)%5C%25%20Free%20Space", "% gemiddelde beschikbare schijfruimte op C:", "avg");
        this.setThreshold(11, 22, false, true);
        await this.newChart("line", "customMetrics%2F%5CLogicalDisk(D:)%5C%25%20Free%20Space", "% gemiddelde beschikbare schijfruimte op D:", "avg");
        this.setThreshold(12, 23, false, true);
        await this.newChart("line", "customMetrics%2F%5CLogicalDisk(HarddiskVolume1)%5C%25%20Free%20Space", "% gemiddelde beschikbare schijfruimte op HarddiskVolume1", "avg");
        this.setThreshold(13, 24, false, true);
        await this.newChart("bar", "exceptions/count", "totaal aantal exceptions", "sum");
        await this.newChart("bar", "requests/failed", "totaal aantal mislukte requests", "sum");
        await this.newChart("line", "customMetrics%2F%5CProcess(_Total)%5C%25%20Processor%20Time", "Processen % processortijd (gemiddeld)", "avg");
        await this.getUpdateStringValue("exceptions | where timestamp > ago("+this.timespanMinutes+"m) | summarize count() by type", "Aantal exceptions", "totaal");
        
        //var Bearerkey = "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6Imk2bEdrM0ZaenhSY1ViMkMzbkVRN3N5SEpsWSIsImtpZCI6Imk2bEdrM0ZaenhSY1ViMkMzbkVRN3N5SEpsWSJ9.eyJhdWQiOiJodHRwczovL21hbmFnZW1lbnQuY29yZS53aW5kb3dzLm5ldC8iLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC8wYzVjNTM4Yi1jNjhiLTQyMTgtODA1Zi02NzUwZDNkZWRiMjcvIiwiaWF0IjoxNTM4MDQ1Mzc0LCJuYmYiOjE1MzgwNDUzNzQsImV4cCI6MTUzODA0OTI3NCwiYWNyIjoiMSIsImFpbyI6IjQyQmdZTEJlYy94WGhidEE1Wk9lZjVmVFAwUUs2YnRkc2ZJMVM5blZ2eS9IemViV1kxc0EiLCJhbHRzZWNpZCI6IjE6bGl2ZS5jb206MDAwNjAwMDBCMTM5NTJBOCIsImFtciI6WyJwd2QiXSwiYXBwaWQiOiJjNDRiNDA4My0zYmIwLTQ5YzEtYjQ3ZC05NzRlNTNjYmRmM2MiLCJhcHBpZGFjciI6IjIiLCJlX2V4cCI6MjYyODAwLCJlbWFpbCI6InJpa3Zlcmh1bHN0MUBob3RtYWlsLmNvbSIsImZhbWlseV9uYW1lIjoiVmVyaHVsc3QiLCJnaXZlbl9uYW1lIjoiUmlrIiwiaWRwIjoibGl2ZS5jb20iLCJpcGFkZHIiOiIyMTMuMTI2LjU1LjUwIiwibmFtZSI6InJpa3Zlcmh1bHN0MSIsIm9pZCI6Ijk1MTU0Y2FmLTg1YjgtNGRiYS1hMWQxLThlNmU3ZDQ1NjY2NSIsInB1aWQiOiIxMDAzQkZGREFEODVCOTJGIiwic2NwIjoidXNlcl9pbXBlcnNvbmF0aW9uIiwic3ViIjoiRTFtME56YTdoRXBjVVFEMzFJc2xfYzRETWpEMk5Fdl9tUFM2ZGFKMkh3YyIsInRpZCI6IjBjNWM1MzhiLWM2OGItNDIxOC04MDVmLTY3NTBkM2RlZGIyNyIsInVuaXF1ZV9uYW1lIjoibGl2ZS5jb20jcmlrdmVyaHVsc3QxQGhvdG1haWwuY29tIiwidXRpIjoiS0hpOExSbnZTa0NORWZNOW81X3RBQSIsInZlciI6IjEuMCJ9.gOeeein4HT6gCBSG6VjQYYQQuRSuvddbtz2OyPwDL5SCOtdd_fF6QXrML2bPRKvAa2oPLZoN8SMpDDAH3B-uCkLQHgX_dvot2Tds1-d8RMGD6V_6khsTVnvzelEEcYgoYY93_IpA-5t3LWExy5dMmKqgFEOCeWKuqjRX4z7Edgy8ICFpg9nET11Y-JpucG6dPsid2zf0ypcyP432BXNqUuMrWss8OJ3PEAM72_PaLk7HytGN517AA0gRMuaNbbJO5P5qax6ZRPrZBh3cQL4doi5asRc0ORX_UuxKZiz8NzGWtOme5I83b3Tl6ba3WIGRO_1GjcMGf3RpWBEKUieR0A";
        //var testData = this.getTestData("Percentage CPU", Bearerkey);
        this.loading.dismiss();
    }

    async newChart(type : string, queryPath : string, customTitle : string, parameterString? : string) {
        var newChart;
        if (type == "pie" || type == "doughnut") {
            newChart = await this.getUpdatePieChart(this.charts.length, queryPath, customTitle);
        }
        else if ((type == "line" || type == "bar") && (parameterString != null && parameterString != "")) {
            newChart = await this.getUpdateLineBar(type, this.charts.length, queryPath, parameterString, customTitle);
        }
        if (newChart != null) {
            var chartSegment = {
                type: type,
                query: queryPath,
                customTitle: customTitle,
                chart: newChart,
                chartview: this.charts.length,
            }
            if (parameterString != null || parameterString != "") {
                chartSegment['parameterString'] = parameterString;
            }
            this.charts.push(chartSegment);
            return;
        }
    }

    //add awaits???
    async updateChartsData() {
        for (var i = 0; i < this.charts.length; i++) {
            var chartSegment = this.charts[i];
            console.log("update!!");
            console.log("data before: ");
            console.log(chartSegment.chart.data.datasets[0].data);
            if (chartSegment.type == "pie" || chartSegment.type == "doughnut") {
                this.getUpdatePieChart(chartSegment.chartview, chartSegment.query, chartSegment.customTitle, chartSegment.chart);
            }
            if (chartSegment.type == "line" || chartSegment.type == "bar") {
                var chartDataBefore = chartSegment.chart.data.datasets[0].data;
                await this.getUpdateLineBar(chartSegment.type, chartSegment.chartview, chartSegment.query, chartSegment.parameterString, chartSegment.customTitle, chartSegment.chart);
                var chartDataAfter = chartSegment.chart.data.datasets[0].data;
                
                if (chartSegment.threshold != undefined) {
                if ((chartDataBefore.length < 1) && (chartDataAfter.length > 0) && chartSegment.threshold.enabled == false) {
                    await this.setThresholdVisibility(chartSegment.chartview, true);
                }
                else if ((chartDataBefore.length > 0) && (chartDataAfter.length < 1) && chartSegment.threshold.enabled == true) {
                    await this.setThresholdVisibility(chartSegment.chartview, false);
                }
            }
            }
            console.log("data after: ");
            console.log(chartSegment.chart.data.datasets[0].data);
        }
        await this.getUpdateStringValue("exceptions | where timestamp > ago("+this.timespanMinutes+"m) | summarize count() by type", "", "");
    }
    getHTTPData(queryPath : string, parameterString? : string) {
        const httpOptions = {
            headers: new HttpHeaders({
              'x-api-key': this.apiKey
            })
          };
        var url = "";
        if (parameterString != null) {
            url = 'https://api.applicationinsights.io/v1/apps/'+this.appId+'/metrics/'+queryPath+'?'+parameterString;
        }
        else {
            url = 'https://api.applicationinsights.io/v1/apps/'+this.appId+'/query?query='+queryPath;
        }
        return new Promise((resolve, reject) => {
            this.http.get(url, httpOptions)
            .subscribe(
                data => {
                    resolve(data);
                },
                error => {
                    reject(error);
                }
            );
        });
      }

    async getUpdateLineBar(type: string, ctx : number, queryPath : string, parameterString : string, customTitle : string, existingChart?) {
        var output = [];
        var callParameterString = "interval=PT"+this.intervalMinutes+"M&timespan=PT"+this.timespanMinutes+"M&aggregation="+parameterString;
        await this.getHTTPData(queryPath, callParameterString).then(data => {
            console.log("data"); 
            console.log(data);
            var allData = data['value'];
            var metrics = allData['segments'];
            // if (metrics.length < 1) {
            //     return;
            // }
            var decodedQueryPath = decodeURIComponent(queryPath);
            metrics.forEach(function (value) {
            let coordinates = {"x": value.end,"y": value[decodedQueryPath][parameterString]};
            coordinates.x = new Date(coordinates.x);
            output.push(coordinates);
            });
        },
        (err: HttpErrorResponse) => {
          if (err.error instanceof Error) {
            console.log("Client-side Error occured");
          } else {
            console.log("Error occured");
          }
        });
        try {
            // if (output.length < 1 || output == undefined) {
            //     return;
            // }
            if (existingChart == undefined) {
                if (type != "bar" && type != "line") {
                    console.log("wrong chart type given in function parameter!");
                    return null;
                }
                    var chartConfig:any = {   
                        id: ctx,
                        type: type,
                        data: {
                            xAxisID: 'time',
                            yAxisID: 'value'
                        },
                        options: {
                            maintainAspectRatio: false,
                            animation: false,
                            backgroundColor: 'rgb(133, 171, 255)',
                            responsive: true,
                            title: {
                                display: true,
                                text: customTitle
                            },
                            elements : {
                                point: {
                                    //hides dots in graph line
                                    radius: 0
                                }
                            },
                            legend: {
                               display: false 
                            },
                            scales: {
                                xAxes: [{
                                    type: 'time',
                                    time: {
                                        format: 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]',
                                        displayFormats: {
                                            millisecond: 'HH:mm:ss.SSS',
                                            second: 'HH:mm:ss',
                                            minute: 'HH:mm',
                                            hour: 'HH:mm',
                                            day: 'DD-MM',
                                            week: 'DD-MM-YYYY',
                                            month: 'MM-YYYY',
                                            quarter: 'MM-YYYY',
                                            year: 'YYYY'
                                        }
                                    },
                                    distributions: 'series',
                                    position: 'bottom',
                                }],
                                yAxes: [{
                                    ticks: {
                                        beginAtZero: true,
                                        suggestedMin: 0,
                                    },
                                    type: 'linear',
                                    position: 'left',
                                }]
                            }
                        }
                      }
                    if (type == "line") {
                        chartConfig.data.datasets = [{borderColor: "blue", fill: false, lineTension: 0}];
                    } else if (type == "bar") {
                        chartConfig.data.datasets = [{backgroundColor: "blue"}];
                    }
                    if (output.length > 0 && output != undefined) {
                        chartConfig.data.datasets[0].data = output;
                        //chartConfig.options.scales.xAxes[0].ticks.suggestedMin = output[0].x;
                        chartConfig.options.scales.xAxes[0].ticks = {suggestedMin: output[0].x};
                    }
                    Chart.pluginService.register({
                        afterDraw: function(chart) {
                            if (chart.data.datasets.length < 1 || chart.data.datasets[0].data.length == 0) {
                                var ctx = chart.chart.ctx;
                                var width = chart.chart.width;
                                var height = chart.chart.height;

                                ctx.save();
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';
                                ctx.font = "16pt normal 'Helvetica Nueue'";
                                ctx.fillText("Geen data", width / 2, height / 2);
                                ctx.restore();
                            }
                        }
                    });
                    var chart = new Chart(String(ctx), chartConfig);
                    document.getElementById(String(ctx)).style.backgroundColor = this.chartsBackgroundColor;
                    console.log("chart: ");
                    console.log(chart);
                    return chart;
            }
            //update chart
            else {
                existingChart.data.datasets[0].data = output;
                existingChart.update();
                return;
            }
        }
        catch(e) {
            console.log("Error: " + e);
        }
    }
    async getUpdatePieChart(chartId : number, query : string, customTitle : string, existingChart?) {
        var labels = [];
        var values = [];
        var colors = [];
        var totalValues = 0;
        await this.getHTTPData(query).then(data => {
            var rows = data['tables']['0']['rows'];
            rows.forEach( function(value) {
                labels.push(value['0']);
                values.push(value['1'])
                totalValues += value['1']
            });
            //only update colors when chart isn't created yet or data size changes
            if (existingChart == null || (existingChart.data.datasets[0].data.length < values.length && existingChart.data.labels.length < labels.length)) {
                var pieColors = [
                    "rgb(255, 128, 0)", "rgb(128, 255, 0)", "rgb(0, 255, 128)", "rgb(0, 128, 255)", "rgb(128, 0, 255)", "rgb(255, 0, 128)", "rgb(255, 64, 0)", "rgb(191, 255, 0)", "rgb(0, 255, 64)", "rgb(0, 191, 255)", "rgb(64, 0, 255)", "rgb(255, 0, 191)", "rgb(255, 191, 0)", "rgb(64, 255, 0)", "rgb(0, 255, 191)", "rgb(0, 64, 255)", "rgb(191, 0, 255)", "rgb(255, 0, 64)"
            ];
            colors = pieColors.slice(0, values.length);
            }
            },
            (err: HttpErrorResponse) => {
              if (err.error instanceof Error) {
                console.log("Client-side Error occured");
              } else {
                console.log("Error occured");
              }
            });
                if (existingChart == undefined) {
                var chartConfig:any = {
                    id: chartId,
                    type: 'pie',
                    data: {
                        datasets: [{
                            data: values,
                            backgroundColor: colors
                        }],
                        labels: labels,
                    },
                    options : {
                        maintainAspectRatio: false,
                        animation: false,
                        backgroundColor: 'rgb(133, 171, 255)',
                        title: {
                            display: true,
                            text: [customTitle, "totaal: " + totalValues]
                        },
                        legend: {
                            display: false
                        },
                        plugins: {
                            labels: [{
                                render: 'value',
                                position: 'border',
                                textShadow: true,
                                fontColor: '#000000',
                                shadowColor: 'rgba(255, 255, 255, 1)',
                                shadowOffsetX: 0,
                                shadowOffsetY: 0,
                                shadowBlur: 3
                                //overlap: false
                            }, {
                                render: 'label',
                                position: 'outside',
                                outsidePadding: 0,
                                textMargin: 6
                            }]
                        }
                    }
                };

                Chart.pluginService.register({
                    afterDraw: function(chart) {
                        if (chart.data.datasets.length < 1 || chart.data.datasets[0].data.length == 0) {
                            var ctx = chart.chart.ctx;
                            var width = chart.chart.width;
                            var height = chart.chart.height;
                            //chart.clear();

                            ctx.save();
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.font = "16pt normal 'Helvetica Nueue'";
                            ctx.fillText('Geen data', width / 2, height / 2);
                            ctx.restore();
                        }
                    }
                });
                var chart = new Chart(String(chartId), chartConfig);
                document.getElementById(String(chartId)).style.backgroundColor = this.chartsBackgroundColor;
                return chart;
            } else {
                if (colors.length > 0) {
                    existingChart.data.datasets[0].backgroundColor = colors;
                }
                existingChart.data.datasets[0].data = values;
                existingChart.data.labels = labels;
                existingChart.options.title.text = [customTitle, "totaal: " + totalValues];
                existingChart.update();

                return;
            }
    }

    async setThreshold(chartViewInt : number, value : number, isMax : boolean, percent? : boolean) {
        try {
            if (this.charts[chartViewInt] == null || this.charts[chartViewInt] == undefined) {
                return;
            }
            if (percent == undefined || percent == null) {
                percent = false;
            }
            this.charts[chartViewInt].threshold = {
                value: value,
                isMax: isMax,
                percent: percent,
                enabled: false
            }
            var data = this.charts[chartViewInt].chart.data.datasets[0].data;
            Chart.pluginService.register(annotation);
            if (data.length < 1) {
                return;
            } else {
                await this.setThresholdVisibility(chartViewInt, true);
            }
        }
        catch (e) {
            console.log("Error: ", e);
        }
    }

    setThresholdVisibility(chartViewInt : number, enabled : boolean) {
        //var divElement = document.getElementById(String(chartViewInt)).parentElement;
        var thisChart = this.charts[chartViewInt];
        if (enabled && thisChart.threshold.enabled == false) {
            //divElement.style.backgroundColor = "rgba(255, 15, 15, 0.2)";
            var thresholdData = this.charts[chartViewInt].threshold;
            var chartData = thisChart.chart.data.datasets[0].data;
            this.charts[chartViewInt].chart.options.annotation = {
                annotations: [
                    //red colored box above/under threshold
                    {
                        backgroundColor: 'rgba(255, 0, 0, 0.3)',
                        borderColor: 'rgba(255, 0, 0, 0.3)',
                        fill: false,
                        type: 'box',
                        xScaleID: 'x-axis-0',
                        yScaleID: 'y-axis-0',
                        xMin: chartData[0].x
                    },
                    //green colored box under/above threshold
                    {
                      backgroundColor: 'rgba(13, 255, 0, 0.3)',
                      borderColor: 'rgba(13, 255, 0, 0.3)',
                      fill: false,
                      type: 'box',
                      xScaleID: 'x-axis-0',
                      yScaleID: 'y-axis-0',
                      xMin: chartData[0].x
                  }
                  ]
            }
            var maxValueYAxis = 0;
            if (chartData.length > 0) {
                chartData.forEach(data => {
                    if (data.y > maxValueYAxis) {
                        maxValueYAxis = data.y;
                    }
                    });
            } else {
                maxValueYAxis = thresholdData.value;
            }
            if (thresholdData.isMax) {
                this.charts[chartViewInt].chart.options.annotation.annotations[0].yMin = thresholdData.value;
                //this.charts[chartViewInt].chart.options.annotation.annotations[0].yMax = (maxValueYAxis + 50);
                this.charts[chartViewInt].chart.options.annotation.annotations[1].yMax = thresholdData.value;
                this.charts[chartViewInt].chart.options.annotation.annotations[1].yMin = 0;
            } else {
                this.charts[chartViewInt].chart.options.annotation.annotations[0].yMax = thresholdData.value;
                this.charts[chartViewInt].chart.options.annotation.annotations[0].yMin = 0;
                this.charts[chartViewInt].chart.options.annotation.annotations[1].yMin = thresholdData.value;
                this.charts[chartViewInt].chart.options.annotation.annotations[1].yMax = (maxValueYAxis + 50);
            }
            if (thresholdData.percent) {
                if ((maxValueYAxis + 5) <= 100) {
                    this.charts[chartViewInt].chart.options.scales.yAxes[0].ticks.suggestedMax = maxValueYAxis + this.suggestedMaxChartValueMarge;
                } else {
                    this.charts[chartViewInt].chart.options.scales.yAxes[0].ticks.suggestedMax = this.suggestedMaxChartPercent;
                }
            } else {
                this.charts[chartViewInt].chart.options.scales.yAxes[0].ticks.suggestedMax = maxValueYAxis + 5;
            }

                //decide if threshold line needs to be shown in chart
                //if ((thresholdData.isMax && maxValueYAxis >= (thresholdData.value - 20)) || !thresholdData.isMax || thresholdData.percent) {
                    this.charts[chartViewInt].chart.options.annotation.annotations.push({
                        borderColor: 'red',
                        borderDash: [2, 2],
                        borderWidth: 2,
                        mode: 'horizontal',
                        scaleID: 'y-axis-0',
                        type: 'line',
                        value: thresholdData.value,
                        xMin: chartData[0].x
                    });
                //}
            this.charts[chartViewInt].chart.options.scales.xAxes[0].ticks.suggestedMin = chartData[0].x;
            this.charts[chartViewInt].threshold.enabled = true;
            this.charts[chartViewInt].chart.update();
        } else {
            //delete divElement.style.backgroundColor;
            delete thisChart.chart.options.annotation.annotations;
            thisChart.threshold.enabled = false;
            thisChart.chart.update();
        }
        return;
    }

    updateThresholds(oldData : any, newData : any) {
        this.charts.forEach((chart) => {
            if (chart.threshold != undefined) {

            }
        })
    }
    checkThresholds() {
        this.charts.forEach((segment) => {
            if (segment.options == null || segment.options == undefined) {
                return;
            } else if (segment.options.annotation != null) {
                segment.forEach((value) => {
                    if (moment(value.x) <= moment() && moment(value.x) > moment()) {

                    }
                });
            }
        });

    }

    setRefresher(timeMin : number) {
        setTimeout(() => {
            this.updateChartsData();
            //this.checkThresholds();
            return this.setRefresher(timeMin);
        }, (timeMin*60000))
    };

    getBearerKey() {
        var url = "https://login.microsoftonline.com/common/oauth2/authorize?client_id=58b55a48-69ce-417e-b2c6-5802c41b174a&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A8100&response_mode=query&resource=https%3A%2F%2Fservice.contoso.com%2F&state=12345"
        return new Promise((resolve, reject) => {
            this.http.get(url)
            .subscribe(
                data => {
                    resolve(data);
                },
                error => {
                    reject(error);
                }
            );
        });
      }

      //testmethods for Bearerkey
      async printBearerAuthCode() {
        await this.getBearerKey().then(data => {
            console.log("bearer: ");
            console.log(data);
        });
      }

      getNewHTTPData(type : string, bearer : string) {
        const httpOptions = {
            headers: new HttpHeaders({
                //Bearer key
              'Authorization': bearer,
              'Content-Type': 'application/json'
            })
          };
        var url = 'https://management.azure.com/subscriptions/58b55a48-69ce-417e-b2c6-5802c41b174a/resourceGroups/testgroep/providers/Microsoft.Compute/virtualMachines/testVM/providers/microsoft.Insights/metrics?timespan=2018-09-18T10:10:00.000Z/2018-09-19T13:10:00.000Z&interval=PT5M&metricnames='+type+'&aggregation=average&metricNamespace=microsoft.compute/virtualmachines&autoadjusttimegrain=true&api-version=2018-01-01';
        return new Promise((resolve, reject) => {
            this.http.get(url, httpOptions)
            .subscribe(
                data => {
                    resolve(data);
                },
                error => {
                    reject(error);
                }
            );
        });
      }
    async getTestData(type : string, bearer : string) {
        await this.getNewHTTPData(type, bearer).then(data => {
            console.log(type);
            console.log(data);
        })
    }

    async getUpdateStringValue(query : string, customTitle : string, underTitle : string) {
        var output = [];
        var totalValues = 0;
        await this.getHTTPData(query).then(data => {
            var rows = data['tables']['0']['rows'];
            rows.forEach( function(value) {
                output.push({label: value['0'], value: value['1']});
                totalValues += value['1']
            });
            console.log("totaal: "+totalValues);
            output.forEach((segment) => {
                console.log(segment.label+": "+segment.value);
            });
            },
            (err: HttpErrorResponse) => {
              if (err.error instanceof Error) {
                console.log("Client-side Error occured");
              } else {
                console.log("Error occured");
              }
            });
            try {
            var c = <HTMLCanvasElement> document.getElementById(String(this.charts.length));
            var bcr = c.getBoundingClientRect();
            var ctx = c.getContext("2d");
            c.style.width = "100%";
            c.style.height = "100%";
            c.width = bcr.width;
            c.height = bcr.height;
            //ctx.scale(dpr, dpr);
            c.style.display = "block";
            c.style.backgroundColor = 'rgb(209, 223, 255)';
    
            ctx.textAlign='center';
            ctx.font="bold 12px 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif";
            ctx.fillStyle = 'rgb(102, 102, 102)';
            ctx.fillText(customTitle, (c.width/2), 20);
            ctx.fillText("totaal: "+totalValues, (c.width/2), 35);
            if (output.length < 1) {
                ctx.textBaseline = 'middle';
                ctx.fillText("Geen data", c.width / 2, c.height / 2);
            } else {
                ctx.font="14px 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif";
                var startTextline = 50;
                for(var i=0; i<output.length; i++) {
                    var line = startTextline + (i*20);
                    if (line >= (c.height - 15)) {
                        ctx.textAlign = 'center';
                        ctx.fillText("... (nog " + (output.length - (i+1)) + " resterend)", (c.width/2), line);
                        i = output.length;
                    } else {
                        ctx.textAlign = 'left';
                        ctx.fillText(output[i].label, 15, line);
                        ctx.textAlign = 'right';
                        ctx.fillText(output[i].value, (c.width - 15), line);
                        console.log(output[i].label+" "+output[i].value);
                    }
                }
            }
        } catch (e) {
            console.log("Error: ", e);
        }
    }
}