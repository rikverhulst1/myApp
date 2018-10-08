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
    spinners = [];
    constructor(private http: HttpClient, public navCtrl: NavController, public loadingCtrl: LoadingController){
        this.tabBarElement = document.querySelector('.tabbar');
    }
    //loadingcontroller to show when page loads
    loading = this.loadingCtrl.create({
        content: 'configuratiebestand zoeken en controleren'
    });

    async ionViewCanEnter() {
        this.tabBarElement.style.display = 'none';
        this.loading.present();
        await this.getFile("assets/data/chartsConfig.json").then(data => this.jsonInputFile = data);
        await this.checkEmptyJsonObjects();
        this.loading.dismiss();
    }

    async ionViewDidLoad() {
        await this.createUpdateCharts();
        this.setRefresher(this.jsonInputFile.options.intervalMinutes);
    }

    ionViewWillLeave() {
        this.tabBarElement.style.display = 'none';
    }

    setRefresher(timeMin : number) {
        setTimeout(async () => {
            await this.createUpdateCharts();
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

    async checkEmptyJsonObjects() {
        var defaults = await this.getFile("assets/data/chartsConfigDefaults.json");
        for (var i = 0; i < this.jsonInputFile.charts.length; i++) {
            // defaults.chart.forEach(function (key, value) {
            //     if (!(this.jsonInputFile.charts[i].hasOwnProperty(key))) {
            //         this.jsonInputFile.charts[i][key] = value;
            //     }
            // })
            if (this.jsonInputFile.charts[i].type == null) { this.jsonInputFile.charts[i].type = defaults.chart.type;}
            if (this.jsonInputFile.charts[i].title == null) { this.jsonInputFile.charts[i].title = defaults.chart.title;} 
            if (this.jsonInputFile.charts[i].threshold != null) {
                if (this.jsonInputFile.charts[i].threshold.isMax == null) { this.jsonInputFile.charts[i].threshold.isMax = defaults.chart.threshold.isMax;}
                if (this.jsonInputFile.charts[i].threshold.isPercent == null) { this.jsonInputFile.charts[i].threshold.isPercent = defaults.chart.threshold.isPercent;}
            }
        }
        if (this.jsonInputFile.options.appId == null) { this.jsonInputFile.options.appId = defaults.options.appId;}
        if (this.jsonInputFile.options.apiKey == null) { this.jsonInputFile.options.apiKey = defaults.options.apiKey;}
        if (this.jsonInputFile.options.timespanDays == null) { this.jsonInputFile.options.timespanDays = defaults.options.timespanDays;}
        if (this.jsonInputFile.options.intervalMinutes == null) { this.jsonInputFile.options.intervalMinutes = defaults.options.intervalMinutes;}
        if (this.jsonInputFile.options.timeFormat == null) { this.jsonInputFile.options.timeFormat = defaults.options.timeFormat;}
        if (this.jsonInputFile.options.canvasDefaultBackgroundColor == null) { this.jsonInputFile.options.canvasDefaultBackgroundColor = defaults.options.canvasDefaultBackgroundColor;}
        if (this.jsonInputFile.options.canvasWarningBackgroundColor == null) { this.jsonInputFile.options.canvasWarningBackgroundColor = defaults.options.canvasWarningBackgroundColor;}
        if (this.jsonInputFile.options.canvasCriticalBackgroundColor == null) { this.jsonInputFile.options.canvasCriticalBackgroundColor = defaults.options.canvasCriticalBackgroundColor;}
        if (this.jsonInputFile.options.canvasEmptyBackgroundColor == null) { this.jsonInputFile.options.canvasEmptyBackgroundColor = defaults.options.canvasEmptyBackgroundColor;}
        if (this.jsonInputFile.options.canvasDefaultFontColor == null) { this.jsonInputFile.options.canvasDefaultFontColor = defaults.options.canvasDefaultFontColor;}
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
            Chart.defaults.global.defaultFontColor=this.jsonInputFile.options.canvasDefaultFontColor;

            for (var j = 0; j < this.jsonInputFile.charts.length; j++) {
                var canvas = <HTMLCanvasElement> document.getElementById(String(j));
                canvas.style.backgroundColor = this.jsonInputFile.options.canvasDefaultBackgroundColor;
            }
        }
        for (var i = 0; i < this.jsonInputFile.charts.length; i++) {
            var canvas = <HTMLCanvasElement> document.getElementById(String(i));
            canvas.style.padding = "2px";
            canvas.style.border = "0px";
            canvas.style.margin = "0px";
            var spinnerDiv = document.getElementById(String(i)).previousElementSibling as HTMLElement;
            spinnerDiv.style.zIndex = "1";
            var spinner = document.getElementById(String(i)).previousElementSibling.firstChild as HTMLElement;
            spinner.style.display = "initial";
            var chart = this.jsonInputFile.charts[i];
            var url = 'https://api.applicationinsights.io/v1/apps/'+this.jsonInputFile.options.appId
            
            if (chart.aggregation != null && (chart.type == "line" || chart.type == "bar")) {
                url += '/metrics/'+chart.attribute+"?interval=PT"+this.jsonInputFile.options.intervalMinutes+"M&timespan=P"+this.jsonInputFile.options.timespanDays+"D&aggregation="+chart.aggregation;
            } else if (chart.type == "pie" || chart.type == "doughnut" || chart.type == "text") {
                var hours = this.jsonInputFile.options.timespanDays * 24;
                url += '/query?query='+chart.attribute+" | where timestamp > ago("+hours+"h)"+" | "+chart.query;
            }
            var responseData;
            await this.getFile(url, httpOptions).then(data => responseData = data);
            
            //if chart is line or bar, get or update this chart
            if (chart.type == "line" || chart.type == "bar") {
                var output = [];
                var rows = responseData.value.segments;
                rows.forEach(function (row) {
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
                        //maintainAspectRatio: false,
                        animation: false,
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
                    //lineTension to unsmooth lines
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
                            drawTime: 'beforeDatasetsDraw',
                            backgroundColor: 'rgb(255, 122, 122)',
                            borderColor: 'rgb(255, 122, 122)',
                            fill: false,
                            type: 'box',
                            xScaleID: 'x-axis-0',
                            yScaleID: 'y-axis-0',
                            xMin: this.charts[i].chart.data.datasets[0].data[0].x
                        },
                        //green colored box under/above threshold
                        {
                          drawTime: 'beforeDatasetsDraw',
                          backgroundColor: 'rgb(126, 255, 121)',
                          borderColor: 'rgb(126, 255, 121)',
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
                    drawTime: 'beforeDatasetsDraw',
                    borderColor: 'rgb(255, 0, 0)',
                    borderDash: [10, 10],
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
            if (output.length < 1) {
                canvas.style.backgroundColor = this.jsonInputFile.options.canvasEmptyBackgroundColor;
            }
            if (chart.threshold != null && this.charts[i].chart.options.annotation != null && this.charts[i].chart.data.datasets[0].data != null) {
                this.checkThresholds(i);
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
                            //maintainAspectRatio: false,
                            animation: false,
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
                if (labels.length < 1 && values.length < 1) {
                    canvas.style.backgroundColor = this.jsonInputFile.options.canvasEmptyBackgroundColor;
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
                var bcr;
                var ctx;
                if (this.charts[i] == null) {
                bcr = canvas.getBoundingClientRect();
                ctx = canvas.getContext("2d");

                canvas.style.width = "100%";
                canvas.style.height = "100%";
                canvas.width = bcr.width;
                canvas.height = bcr.height;
                canvas.style.display = "block";
                } else {
                canvas = this.charts[i].canvas;
                bcr = this.charts[i].bcr;
                ctx = this.charts[i].ctx;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
                ctx.textAlign = "center";
                ctx.textBaseline="top";
                ctx.font = "bold 13px 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif";
                ctx.fillStyle = "#000000";
                ctx.fillText(chart.title, (canvas.width / 2), 8);
                ctx.fillText("totaal: " + totalValues, (canvas.width / 2), 23);
                if (output.length < 1) {
                    ctx.textBaseline = 'middle';
                    ctx.fillText("Geen data", (canvas.width / 2), (canvas.height / 2));
                    canvas.style.backgroundColor = this.jsonInputFile.options.canvasEmptyBackgroundColor;
                } else {
                    canvas.style.backgroundColor = this.jsonInputFile.options.canvasDefaultBackgroundColor;
                    ctx.font = "14px 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif";
                    var startTextline = 40;
                    for (var j = 0; j < output.length; j++) {
                        var line = startTextline + (j*20);
                        if (line >= (canvas.height - 25)) {
                            ctx.textAlign = "center";
                            ctx.fillText("... (nog " + (output.length - (j+1)) + " resterend)", (canvas.width / 2), (canvas.height - 25));
                            j = output.length;
                        } else {
                            ctx.textAlign = "left";
                            ctx.fillText(output[j].label, 15, line);
                            ctx.textAlign = "right";
                            ctx.fillText(output[j].value, (canvas.width - 15), line);
                        }
                    }
                }
                if (this.charts[i] == null) {
                    var chart: any = {
                        config : {
                            type: chart.type
                        },
                        data: rows,
                        dataValuesSum: totalValues,
                        canvas: canvas,
                        bcr: bcr,
                        ctx: ctx
                    }
                    this.charts.push(chart);
                }
            }
        spinnerDiv.style.zIndex = "-1";
        spinner.style.display = "none";
        }
        return;
    }
    checkThresholds(chartInt : number) {
            var chartFromConfig = this.jsonInputFile.charts[chartInt];
            var createdChart = this.charts[chartInt];
            var canvasStyle = document.getElementById(String(chartInt)).style;
            var inputOptions = this.jsonInputFile.options;
                //if ((createdChart.config.type == "line" || createdChart.config.type == "bar") && chartFromConfig.threshold != null && createdChart.config.options.annotation != null && createdChart.config.data.datasets[0].data != null) {
                    var thValue = chartFromConfig.threshold.value;
                    var thIsMax = chartFromConfig.threshold.isMax;
                    //check for each segment in chartdata whether the values (almost) passes threshold
                    canvasStyle.backgroundColor = inputOptions.canvasDefaultBackgroundColor;
                    createdChart.config.data.datasets[0].data.forEach(function (datasegment, index) {
                        //if y value of segment passes threshold -10% (when isMax) or +10% (when isn't isMax)
                        if ((thIsMax && datasegment.y >= (thValue - (thValue * 0.1))) || (!thIsMax && datasegment.y <= (thValue + (thValue * 0.1)))) {
                            if (((thIsMax && datasegment.y > thValue) || (!thIsMax && datasegment.y < thValue))) {
                                //chartcolor will set to critical if it isn't already this color
                                if (canvasStyle.backgroundColor != inputOptions.canvasCriticalBackgroundColor) {
                                    canvasStyle.backgroundColor = inputOptions.canvasCriticalBackgroundColor;
                                }
                                if (index == (createdChart.config.data.datasets[0].data.length - 1) && canvasStyle.backgroundColor != inputOptions.canvasRecentCriticalBackgroundColor) {
                                    canvasStyle.backgroundColor = inputOptions.canvasRecentCriticalBackgroundColor;
                                    console.log("Last value in chart " + chartInt + " passed threshold!!");
                                    //warn user that last value almost passes threshold
                                }
                            } else {
                                //chartcolor will set to warning if it isn't already this color or it isn't color 
                                if (canvasStyle.backgroundColor != inputOptions.canvasCriticalBackgroundColor && canvasStyle.backgroundColor != inputOptions.canvasRecentCriticalBackgroundColor && canvasStyle.backgroundColor != inputOptions.canvasWarningBackgroundColor) {
                                    canvasStyle.backgroundColor = inputOptions.canvasWarningBackgroundColor;
                                }
                                if (index == (createdChart.config.data.datasets[0].data.length - 1) && canvasStyle.backgroundColor != inputOptions.canvasRecentWarningBackgroundColor) {
                                    console.log("Last value in chart " + chartInt + " almost has passed threshold!!");
                                    canvasStyle.backgroundColor = inputOptions.canvasRecentWarningBackgroundColor;
                                    //warn user that last value passes threshold
                                }
                            }
                        }
                    });
        //}
    }
}
