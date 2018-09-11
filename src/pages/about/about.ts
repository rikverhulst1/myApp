import { Component, ViewChild, ViewChildren, QueryList, AfterViewInit, OnInit } from '@angular/core';
import { NavController } from 'ionic-angular';
import { Chart } from 'chart.js';
import * as annotation from 'chartjs-plugin-annotation';
import {HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'page-about',
  templateUrl: 'about.html'
})

export class AboutPage {
    tabBarElement: any;
    constructor(private http: HttpClient, public navCtrl: NavController){
        this.tabBarElement = document.querySelector('.tabbar');
    }
    appId = "DEMO_APP"
    apiKey = "DEMO_KEY"
    timeFormat: 'DD-MM-YYYY HH:mm:ss.SSS';
    //config:
    lineChart1 = this.lineBarChart("line", "lineChart1", "requests/count", "interval=PT30M&timespan=PT24H&aggregation=sum", "totaal aantal serveraanvragen", 2200, );
    lineChart2 = this.lineBarChart("line", "lineChart2", "pageViews/count", "interval=PT30M&timespan=PT24H&aggregation=sum", "totaal aantal paginaweergaven");
    lineChart3 = this.lineBarChart("line", "lineChart3", "sessions/count", "interval=PT30M&timespan=PT24H&aggregation=unique", "aantal unieke sessies");
    lineChart4 = this.lineBarChart("line", "lineChart4", "performanceCounters/processCpuPercentage", "interval=PT30M&timespan=PT24H&aggregation=count", "gebruikt CPU percentage door processen", 90);
    barChart1 = this.lineBarChart("bar", "barChart1", "users/count", "timespan=P30D&interval=P1D&aggregation=unique", "aantal unieke gebruikers");

    ionViewWillEnter() {
        this.tabBarElement.style.display = 'none';
    }
    ionViewWillLeave() {
        this.tabBarElement.style.display = 'none';
    }

    lineBarChart(type: string, chartId : string, queryPath : string, parameterString : string, customTitle : string, threshold? : number) : any {
        if (type != "bar" && type != "line") {
            console.log("wrong chart type given in function parameter!");
            return null;
        }
        const httpOptions = {
            headers: new HttpHeaders({
              'x-api-key': this.apiKey
            })
          };
        var url = 'https://api.applicationinsights.io/v1/apps/'+this.appId+'/metrics/'+queryPath+'?'+parameterString;
        this.http.get(url, httpOptions).subscribe( data => {
            var aggregation;
            var allData = data['value'];
            var metrics = allData.segments;
            var parameters = parameterString.split("&");
            parameters.forEach(function (value) {
                if (value.includes('aggregation')) {

                    aggregation = value.substring(12);
                }            
            });
            var output = [];
            metrics.forEach(function (value) {
            let coordinates = {"x": value.end,"y": value[queryPath][aggregation]};
            output.push(coordinates);
            });
            var newTitle = customTitle;
            if (customTitle == "") {
                newTitle = queryPath + " (" + aggregation + ")";
            }
            var chartConfig:any = {    
                type: type,
                data: {
                    xAxisID: 'time',
                    yAxisID: 'value',
                    datasets: [{
                        data: output
                        }]
                },
                options: {
                    title: {
                        display: true,
                        text: newTitle
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
                    responsive: true,
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
                            scaleLabel: {
                                display: true,
                                labelString: 'time'
                            }
                        }],
                        yAxes: [{
                            ticks: {
                                beginAtZero: true
                            },
                            type: 'linear',
                            position: 'left',
                            scaleLabel: {
                                display: true,
                                labelString: aggregation
                            }
                        }]
                    }
                }
              }
            if (type == "line") {
                chartConfig.data.datasets = [{
                    borderColor: "blue",
                    data: output,
                    fill: false
            }]
            }
            else if (type == "bar") {
                chartConfig.data.datasets = [{
                    backgroundColor: "blue",
                    data: output
            }]
            }
            if (threshold != null) {
                chartConfig.options.annotation = {
                    annotations: [
                        {
                        borderColor: 'red',
                        borderDash: [2, 5],
                        borderWidth: 2,
                        mode: 'horizontal',
                        scaleID: 'y-axis-0',
                        type: 'line',
                        value: threshold,
                      },
                      {
                          backgroundColor: 'rgba(255, 0, 0, 0.3)',
                          borderColor: 'rgba(255, 0, 0, 0.3)',
                          fill: false,
                          type: 'box',
                          xScaleID: 'x-axis-0',
                          yScaleID: 'y-axis-0',
                          xMin: output[0].x,
                          yMin: threshold
                      },
                      {
                        backgroundColor: 'rgba(13, 255, 0, 0.3)',
                        borderColor: 'rgba(13, 255, 0, 0.3)',
                        fill: false,
                        type: 'box',
                        xScaleID: 'x-axis-0',
                        yScaleID: 'y-axis-0',
                        xMin: output[0].x,
                        yMax: threshold,
                        yMin: 0
                    }
                    ]
                }
            }            
            new Chart(chartId, chartConfig);
            Chart.pluginService.register(annotation);
            return chartId;
        },
        (err: HttpErrorResponse) => {
          if (err.error instanceof Error) {
            console.log("Client-side Error occured");
          } else {
            console.log("Error occured");
          }
        });
        };
}
