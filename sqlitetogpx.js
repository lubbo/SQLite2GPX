#!/usr/bin/env node

const fs = require('fs');
const initSqlJs = require('sql.js');
const filebuffer = fs.readFileSync('gpx.sqlite');
const { buildGPX, GarminBuilder } = require('gpx-builder');
const { Point, Track, Segment } = GarminBuilder.MODELS;

const trackColumnIndex = {
  pk: 0,
  name: 1,
  date: 2,
  distance: 3,
  time: 4,
  calories: 5
}

const courseColumnIndex = {
  pk: 0,
  altitude: 1,
  averagespeed: 2,
  course: 3,
  date: 4,
  distance: 5,
  gliderratio: 6,
  headingaccuracy: 7,
  horizontalaccuracy: 8,
  latitude: 9,
  longitude: 10,
  magneticheading: 11,
  speed: 12,
  timeelapsed: 13,
  trueheading: 14,
  verticalaccuracy: 15,
}

initSqlJs().then(function (SQL) {
  // Load the db
  const db = new SQL.Database(filebuffer);
  // const res = db.exec("select t.Z_PK, t.ZNAME, p.* from ZTRACK as t INNER JOIN ZCOURSEPOINT as p ON t.Z_PK = p.ZTRACK WHERE t.Z_PK = 2 ORDER BY t.Z_PK, p.ZDATE");

  const tracksResultDB = db.exec("select Z_PK, ZNAME, ZDATE, ZDISTANCE, ZTIME, ZCALORIES from ZTRACK");

  // console.log('content', res[0].values);
  const tracksDB = tracksResultDB[0].values;

  const tracksWithId = tracksDB.map((t) => {
    return trackFromDbTrack(t);
  });



  const tracks = tracksWithId.map((t) => {
    const pointsDB = db.exec(`select Z_PK, ZALTITUDE, ZAVERAGESPEED, ZCOURSE, ZDATE, ZDISTANCE, ZGLIDERATIO, ZHEADINGACCURACY, ZHORIZONTALACCURACY, ZLATITUDE, ZLONGITUDE, ZMAGNETICHEADING, ZSPEED, ZTIMEELAPSED, ZTRUEHEADING, ZVERTICALACCURACY from ZCOURSEPOINT WHERE ZTRACK = ${t.id} ORDER BY ZDATE`);
    const points = pointsDB[0].values.map((p) => pointFromDbPoint(p));
    t.gpxTrack.setSegments([new Segment(points)]);
    return t.gpxTrack;
  });


  tracks.forEach((t) => createGpxFile(t));
});

const trackFromDbTrack = (dbTrack) => {
  const meta = {
    name: dbTrack[trackColumnIndex.name],
    extensions: {
      'gpxtrkx:TrackStatsExtension': {
        'gpxtrkx:TotalElapsedTime': dbTrack[trackColumnIndex.time],
        'gpxtrkx:Distance': dbTrack[trackColumnIndex.distance],
        'gpxtrkx:Calories': dbTrack[trackColumnIndex.calories],
      }
    }
  }
  const gpxTrack = new Track([], meta);
  return { gpxTrack: gpxTrack, id: dbTrack[trackColumnIndex.pk] };
}

const pointFromDbPoint = (dbPoint) => {

  const time = dbPoint[courseColumnIndex.date] + 978314368;
  const result = new Point(dbPoint[courseColumnIndex.latitude], dbPoint[courseColumnIndex.longitude], {
    ele: dbPoint[courseColumnIndex.altitude],
    time: new Date(time * 1000),
  });

  return result;
}

const createGpxFile = (track) => {
  const gpx = new GarminBuilder();
  gpx.setTracks([track]);
  const result = buildGPX(gpx.toObject());

  fs.writeFileSync(`./gpx/${track.name}.gpx`, result);

}