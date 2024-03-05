'use client';
import { useState } from "react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { format } from 'date-fns';

const AreaCharter = ({ data }: { data: { graph: string, history: string, graphInterval: number } }) => {

  const { graph, history, graphInterval } = data;
  var parsedHistory;
  var parsedData;
  var minValue = Infinity;
  var maxValue = -Infinity;
  const checkVal = (value: number) => {
    if (value < minValue) {
      minValue = value;
    }
  
    if (value > maxValue) {
      maxValue = value;
    }
  }

  const endDate = new Date();
  var startDate = new Date(endDate);;
  switch(graphInterval){
    case 0: 
      startDate = new Date(endDate.getFullYear()-500, 1);
      break;
    case 1: // last 24 hours
      startDate.setDate(endDate.getDate()-1);
      break;
    case 2: // last 7 days
      startDate.setDate(endDate.getDate()-7);
      break;
    case 3: // last month
      startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
      break;
    case 4: // last 6 months
      startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 6, 1);
      break;
    case 5: // last year
      startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      break;
  }

  if (history && !parsedData){
    parsedHistory = JSON.parse(history);
    switch (graph) {
      case 'Temperature':
        parsedData = parsedHistory.filter(item => {
          const currDate = new Date(item?.M?.date?.S);
            return currDate >= startDate && currDate <= endDate && !isNaN(parseFloat(item?.M?.temp?.S))
          }).map(item => {
            const { temp, date } = item.M;
            checkVal(parseFloat(temp.S));
            return {
                value: parseFloat(temp.S),
                date: date.S
            };
        });
        break;
      case 'Humidity':
        parsedData = parsedHistory.filter(item => {
          const currDate = new Date(item?.M?.date?.S);
            return currDate >= startDate && currDate <= endDate && !isNaN(parseFloat(item?.M?.humidity?.S))
          }).map(item => {
            const { humidity, date } = item.M;
            checkVal(parseFloat(humidity.S));
            return {
                value: parseFloat(humidity.S),
                date: date.S
            };
        });
        break;
      case 'Heat Index':
        parsedData = parsedHistory.filter(item => {
          const currDate = new Date(item?.M?.date?.S);
            return currDate >= startDate && currDate <= endDate && !isNaN(parseFloat(item?.M?.heatIndex?.S))
          }).map(item => {
            const { heatIndex, date } = item.M;
            checkVal(parseFloat(heatIndex.S));
            return {
                value: parseFloat(heatIndex.S),
                date: date.S
            };
        });
        break;
      case 'Speed':
        parsedData = parsedHistory.filter(item => {
          const currDate = new Date(item?.M?.date?.S);
            return currDate >= startDate && currDate <= endDate && !isNaN(parseFloat(item?.M?.speed?.S))
          }).map(item => {
            const { speed, date } = item.M;
            checkVal(parseFloat(speed.S));
            return {
                value: parseFloat(speed.S),
                date: date.S
            };
        });
        break;
      case 'Altitude':
        parsedData = parsedHistory.filter(item => {
          const currDate = new Date(item?.M?.date?.S);
            return currDate >= startDate && currDate <= endDate && !isNaN(parseFloat(item?.M?.alt?.S))
          }).map(item => {
            const { alt, date } = item.M;
            checkVal(parseFloat(alt.S));
            return {
                value: parseFloat(alt.S),
                date: date.S
            };
        });
        break;
    }
  }

    return (
        <ResponsiveContainer width='100%' height='100%'>
          { parsedData?.length > 0 ? (
            <AreaChart 
              width={500} 
              height={400} 
              data={parsedData}
              margin={{ right: 30 }}
            >
              <YAxis domain={[minValue-10, maxValue+10]} />
              <XAxis dataKey='date' tickFormatter={formatXAxisTick} type='category'/>
              <CartesianGrid strokeDasharray='5 5'/>
              <Tooltip content={<CustomTooltip/>}/>
              <Legend/>
{/* the colors for the one below areso pretty */}
              <Area
                  type='monotone'
                  dataKey='value'
                  stroke='#7c3aed'
                  fill='#8b5cf6'
                  stackId='1'
              />
            </AreaChart>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', textAlign: 'center', alignItems: 'center', height: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' }}>
                <span style={{ fontSize: '5vw', marginLeft: '6vw', color: 'rgb(230, 230, 230)' }}>
                  No Data Available
                </span>
              </div>
            </div>
             )}
        </ResponsiveContainer>
        
    )
}

const formatXAxisTick = (tickItem) => {
  const date = new Date(tickItem);
  return format(date, 'MMM dd');
};  


const CustomTooltip = ({ active, payload, label }) =>{
    if (active && payload && payload.length){
        return (
            <div className='p-4 flex flex-col gap-4 rounded-md' style={{ color: 'rgb(230, 230, 230)', backgroundColor: 'rgb(39, 39, 41)' }}>
                <p className='text-medium text-lg'>{formatXAxisTick(label)} | value: {payload[0].value}</p>
            </div>
        )
    }
}



export default AreaCharter;