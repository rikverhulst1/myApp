import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { NavController, LoadingController } from 'ionic-angular';
import { Chart } from 'chart.js';
import * as annotation from 'chartjs-plugin-annotation';
import 'chartjs-plugin-labels';
import {HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import 'rxjs/add/operator/map';
import moment from 'moment';

@Component({
    selector: 'page-about',
    templateUrl: 'about.html'
  })

export class AboutPage {
    tabBarElement: any;
    jsonInputFile;
    charts = [];
    constructor(private http: HttpClient, public navCtrl: NavController, public loadingCtrl: LoadingController){
        this.tabBarElement = document.querySelector('.tabbar');
    }
    //loadingcontroller to show when page loads
    loading = this.loadingCtrl.create({
        content: 'bezig met laden'
    });

    async ionViewCanEnter() {
        this.tabBarElement.style.display = 'none';
        this.loading.present();
        await this.getFile("assets/data/chartsConfig.json").then(data => this.jsonInputFile = data);
    }

    async ionViewDidLoad() {
        await this.createUpdateCharts();
        this.loading.dismiss();
        this.setRefresher(this.jsonInputFile.options.intervalMinutes);
    }

    ionViewWillLeave() {
        this.tabBarElement.style.display = 'none';
    }

    setRefresher(timeMin : number) {
        setTimeout(() => {
            console.log("refreshing...");
            this.createUpdateCharts();
            console.log("refreshed");
            return this.setRefresher(timeMin);
        }, (timeMin*60000))
    };

    getFile(url : string, httpOptions? : any) : any {
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

    async createUpdateCharts() {
        const httpOptions =  {
            headers: new HttpHeaders({
                'x-api-key': this.jsonInputFile['options']['apiKey']
            })
        };
        if (this.charts.length < 1) {
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
        }
        for (var i = 0; i < this.jsonInputFile.charts.length; i++) {
            var chart = this.jsonInputFile.charts[i];
            var url = 'https://api.applicationinsights.io/v1/apps/'+this.jsonInputFile.options.appId
            
            if (chart.aggregation != null && (chart.type == "line" || chart.type == "bar")) {
                url += '/metrics/'+chart.attribute+"?interval=PT"+this.jsonInputFile.options.intervalMinutes+"M&timespan=PT"+this.jsonInputFile.options.timespanMinutes+"M&aggregation="+chart.aggregation;
            } else if (chart.type == "pie" || chart.type == "doughnut" || chart.type == "text") {
                url += '/query?query='+chart.attribute+" | where timestamp > ago("+this.jsonInputFile.options.timespanMinutes+"m)"+" | "+chart.query;
            }
            var responseData;
            await this.getFile(url, httpOptions).then(data => responseData = data);
            document.getElementById(String(i)).style.backgroundColor = this.jsonInputFile.options.viewChartsBackgroundColor;
            
            //if chart is line or bar, get or update this chart
            if (chart.type == "line" || chart.type == "bar") {
                var output = [];
                var rows = responseData.value.segments;
                rows.forEach(function (row) {
                    console.log(row.Index);
                    let coordinates = {"x": new Date(row.end), "y": row[decodeURIComponent(chart.attribute)][chart.aggregation]};
                    output.push(coordinates);
                })

                
                if (this.charts[i] == null) {
                var chartConfig:any = {   
                    id: i,
                    type: chart.type,
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
                            text: chart.title
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
                if (chart.type == "line") {
                    chartConfig.data.datasets = [{borderColor: "blue", fill: false, lineTension: 0}];
                } else if (chart.type == "bar") {
                    chartConfig.data.datasets = [{backgroundColor: "blue"}];
                }
                if (output.length > 0 && output != undefined) {
                    chartConfig.data.datasets[0].data = output;
                    chartConfig.options.scales.xAxes[0].ticks = {suggestedMin: output[0].x};
                }
                Chart.pluginService.register(annotation);
                var newChart = new Chart(String(i), chartConfig);
                await this.charts.push(newChart);
            } else {
                this.charts[i].chart.data.datasets[0].data = output;
                await this.charts[i].chart.update();
            }

            //add visible threshold if the new/updated chart has a threshold and the threshold isn't visible yet
            if ((chart.hasOwnProperty('threshold')) && !(this.charts[i].chart.options.annotation) && (this.charts[i].chart.data.datasets[0].data.length > 0)) {
                this.charts[i].options.annotation = {
                    annotations: [
                        //red colored box above/under threshold
                        {
                            backgroundColor: 'rgba(255, 0, 0, 0.3)',
                            borderColor: 'rgba(255, 0, 0, 0.3)',
                            fill: false,
                            type: 'box',
                            xScaleID: 'x-axis-0',
                            yScaleID: 'y-axis-0',
                            xMin: this.charts[i].chart.data.datasets[0].data[0].x
                        },
                        //green colored box under/above threshold
                        {
                          backgroundColor: 'rgba(13, 255, 0, 0.3)',
                          borderColor: 'rgba(13, 255, 0, 0.3)',
                          fill: false,
                          type: 'box',
                          xScaleID: 'x-axis-0',
                          yScaleID: 'y-axis-0',
                          xMin: this.charts[i].chart.data.datasets[0].data[0].x
                      }
                      ]
                }
                var maxValueYAxis = 0;
                //find max value y-axis from data
                this.charts[i].chart.data.datasets[0].data.forEach(function (row) {
                    if (row.y > maxValueYAxis) {
                        maxValueYAxis = row.y;
                    }
                });
                //threshold when data values are higher than x
                if (chart.threshold.isMax) {
                    this.charts[i].chart.options.annotation.annotations[0].yMin = chart.threshold.value;
                    //this.charts[chartViewInt].chart.options.annotation.annotations[0].yMax = (maxValueYAxis + 50);
                    this.charts[i].chart.options.annotation.annotations[1].yMax = chart.threshold.value;
                    this.charts[i].chart.options.annotation.annotations[1].yMin = 0;
                }
                //threshold when data values are lower than x
                else {
                    this.charts[i].chart.options.annotation.annotations[0].yMax = chart.threshold.value;
                    this.charts[i].chart.options.annotation.annotations[0].yMin = 0;
                    this.charts[i].chart.options.annotation.annotations[1].yMin = chart.threshold.value;
                    this.charts[i].chart.options.annotation.annotations[1].yMax = (maxValueYAxis + 50);
                }
                //if given percent property is true, set max value y-axis to 100
                if (chart.threshold.isPercent) {
                    // if ((maxValueYAxis + 5) <= 100) {
                    //     chartConfig.options.scales.yAxes[0].ticks.suggestedMax = maxValueYAxis + this.suggestedMaxChartValueMarge;
                    // } else {
                    //     this.charts[chartViewInt].chart.options.scales.yAxes[0].ticks.suggestedMax = this.suggestedMaxChartPercent;
                    // }
                    this.charts[i].chart.options.scales.yAxes[0].ticks.suggestedMax = 100;
                }
                //else set max-value y-axis to max-value data + 5
                else {
                    this.charts[i].chart.options.scales.yAxes[0].ticks.suggestedMax = maxValueYAxis + 5;
                }
                this.charts[i].chart.options.annotation.annotations.push({
                    borderColor: 'red',
                    borderDash: [2, 2],
                    borderWidth: 2,
                    mode: 'horizontal',
                    scaleID: 'y-axis-0',
                    type: 'line',
                    value: chart.threshold.value,
                    xMin: this.charts[i].chart.data.datasets[0].data[0].x
                });
                    //}
                    this.charts[i].chart.options.scales.xAxes[0].ticks.suggestedMin = this.charts[i].chart.data.datasets[0].data[0].x;
                    await this.charts[i].chart.update(); 
                }
                //remove visible threshold if chartdata is empty
                else if ((chart.hasOwnProperty('threshold')) && "annotation" in this.charts[i].chart.options && this.charts[i].chart.data.datasets[0].data.length < 1) {
                delete this.charts[i].chart.options.annotation;
                await this.charts[i].chart.update();
            }
            //if chart is pie or doughnut, update this chart
            } else if (chart.type == "pie" || chart.type == "doughnut") {
                var labels = [];
                var values = [];
                var colors = [];
                var totalValues = 0;
                var rows = responseData.tables[0].rows;
                rows.forEach(function(row) {
                    labels.push(row[0]);
                    values.push(row[1]);
                    totalValues += row[1];
                });
                //only update colors when chart isn't created yet or data size changes
                if (this.charts[i] == null || (this.charts[i].data.datasets[0].data.length < values.length && this.charts[i].data.labels.length < labels.length)) {
                var pieColors = [
                    "rgb(255, 128, 0)", "rgb(128, 255, 0)", "rgb(0, 255, 128)", "rgb(0, 128, 255)", "rgb(128, 0, 255)", "rgb(255, 0, 128)", "rgb(255, 64, 0)", "rgb(191, 255, 0)", "rgb(0, 255, 64)", "rgb(0, 191, 255)", "rgb(64, 0, 255)", "rgb(255, 0, 191)", "rgb(255, 191, 0)", "rgb(64, 255, 0)", "rgb(0, 255, 191)", "rgb(0, 64, 255)", "rgb(191, 0, 255)", "rgb(255, 0, 64)"
                ];
                colors = pieColors.slice(0, values.length);
                if (this.charts[i] == null) {
                    var chartConfig:any = {
                        id: i,
                        type: chart.type,
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
                                text: [chart.title, "totaal: " + totalValues]
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
                    var newChart = new Chart(String(i), chartConfig);
                    await this.charts.push(newChart);
                } else {
                    if (colors.length != this.charts[i].data.datasets[0].backgroundColor.length) {
                        this.charts[i].data.datasets[0].backgroundColor = colors;
                    }
                    this.charts[i].chart.data.datasets[0].data = values;
                    this.charts[i].chart.data.labels = labels;
                    this.charts[i].chart.options.title.text[1] = "totaal: "+totalValues;
                    await this.charts[i].chart.update();
                }
            }
            } else if (chart.type == "text") {
                var output = [];
                var rows = responseData.tables[0].rows;
                var totalValues = 0;
                rows.forEach(function(row) {
                    output.push({label: row[0], value: row[1]});
                    totalValues += row[1];
                });
                var canvas = <HTMLCanvasElement> document.getElementById(String(i));
                var bcr = canvas.getBoundingClientRect();
                var ctx = canvas.getContext("2d");
                canvas.style.width = "100%";
                canvas.style.height = "100%";
                canvas.width = bcr.width;
                canvas.height = bcr.height;
                canvas.style.display = "block";
                canvas.style.backgroundColor = this.jsonInputFile.options.viewChartsBackgroundColor;
                ctx.textAlign = "center";
                ctx.font = "bold 13px 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif";
                ctx.fillStyle = "rgb(102, 102, 102)";
                ctx.fillText(chart.title, (canvas.width / 2), 20);
                ctx.fillText("totaal: " + totalValues, (canvas.width / 2), 35);
                if (output.length < 1) {
                    ctx.textBaseline = 'middle';
                    ctx.fillText("Geen data", (canvas.width / 2), (canvas.height / 2));
                } else {
                    ctx.font = "14px 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif";
                    var startTextline = 55;
                    for (var j = 0; j < output.length; j++) {
                        var line = startTextline + (j*20);
                        if (line >= (canvas.height - 15)) {
                            ctx.textAlign = "center";
                            ctx.fillText("... (nog " + (output.length - (j+1)) + " resterend", (canvas.width / 2), line);
                            j = output.length;
                        } else {
                            ctx.textAlign = "left";
                            ctx.fillText(output[j].label, 15, line);
                            ctx.textAlign = "right";
                            ctx.fillText(output[j].value, (canvas.width - 15), line);
                        }
                    }
                }
            }
        }
        return;
    }
}