import assert from "node:assert/strict";
import { test } from "node:test";
import { demoFleet } from "./demo-fleet";
import { bearingDeg, haversineKm, pingPong, pointAlong, routeLengthKm, type LatLng } from "./geo";

const near = (a: number, b: number, eps = 0.01) => assert.ok(Math.abs(a - b) <= eps, `${a} !≈ ${b}`);

test("jarak Jakarta - Bandung lurus sekitar 115-125 km", () => {
  const d = haversineKm([-6.2088, 106.8456], [-6.9175, 107.6191]);
  assert.ok(d > 110 && d < 125, String(d));
});

test("arah mata angin dasar", () => {
  near(bearingDeg([0, 0], [1, 0]), 0, 0.5);
  near(bearingDeg([0, 0], [0, 1]), 90, 0.5);
  near(bearingDeg([0, 0], [-1, 0]), 180, 0.5);
  near(bearingDeg([0, 0], [0, -1]), 270, 0.5);
});

test("pointAlong: awal, tengah segmen, dan dijepit di ujung", () => {
  const path: LatLng[] = [[0, 0], [0, 1], [1, 1]];
  assert.deepEqual(pointAlong(path, 0).pos, [0, 0]);
  const half = routeLengthKm(path.slice(0, 2)) / 2;
  near(pointAlong(path, half).pos[1], 0.5, 1e-6);
  assert.deepEqual(pointAlong(path, 1e9).pos, [1, 1]);
  assert.deepEqual(pointAlong(path, -5).pos, [0, 0]);
});

test("pingPong bolak-balik pada rute", () => {
  const L = 100;
  assert.deepEqual(pingPong(0, L), { km: 0, returning: false });
  assert.deepEqual(pingPong(100, L), { km: 100, returning: false });
  assert.deepEqual(pingPong(150, L), { km: 50, returning: true });
  assert.deepEqual(pingPong(200, L), { km: 0, returning: false });
  assert.deepEqual(pingPong(225, L), { km: 25, returning: false });
  assert.deepEqual(pingPong(-50, L), { km: 50, returning: true });
});

test("armada simulasi: deterministik, bergerak, dan statusnya masuk akal", () => {
  const t0 = new Date("2026-11-04T10:00:00Z");
  const a = demoFleet(t0);
  assert.deepEqual(a, demoFleet(t0));
  assert.equal(a.units.length, 8);
  assert.equal(new Set(a.units.map((u) => u.plate)).size, 8);

  const b = demoFleet(new Date(t0.getTime() + 10_000));
  const moving = a.units.filter((u) => u.status === "MOVING");
  assert.ok(moving.length >= 4);
  for (const u of moving) {
    const v = b.units.find((x) => x.id === u.id)!;
    assert.ok(haversineKm([u.lat, u.lng], [v.lat, v.lng]) > 0.05, `${u.plate} tidak bergerak`);
    assert.ok(u.speedKmh > 0 && u.speedKmh < 120);
  }
  for (const u of a.units.filter((x) => x.status !== "MOVING")) {
    const v = b.units.find((x) => x.id === u.id)!;
    assert.deepEqual([u.lat, u.lng], [v.lat, v.lng]);
    assert.equal(u.speedKmh, 0);
  }
  const off = a.units.find((u) => u.status === "OFFLINE")!;
  assert.ok(Date.parse(a.at) - Date.parse(off.lastUpdate) >= 40 * 60_000);
});

test("semua posisi simulasi tetap di sekitar Pulau Jawa", () => {
  for (const h of [0, 5, 11, 17, 23]) {
    for (const u of demoFleet(new Date(Date.UTC(2026, 10, 4, h))).units) {
      assert.ok(u.lat > -8.6 && u.lat < -5.8, `${u.plate} lat ${u.lat}`);
      assert.ok(u.lng > 105.9 && u.lng < 113.1, `${u.plate} lng ${u.lng}`);
    }
  }
});
