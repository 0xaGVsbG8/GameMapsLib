import Link from "next/link";
import "./guide.css";

export default function AdminGuidePage() {
  return (
    <main className="guide-page">
      <article className="guide-card">
        <Link className="guide-back" href="/admin/dashboard">
          ← Back to dashboard
        </Link>
        <h1>Map origin and pixels per unit</h1>
        <p className="guide-lead">
          Turn on Coordinates feature when you add a map. Those three numbers
          line the image up with in-game coordinates so a marker at (100, 40)
          in the game lands on the right pixel on the picture.
        </p>

        <h2>What the numbers mean</h2>
        <ul>
          <li>
            <strong>Pixels per unit</strong> is the scale: how many pixels on
            the image equal one unit in the game.
          </li>
          <li>
            <strong>Origin X</strong> and <strong>Origin Y</strong> are the
            pixel on the image where in-game (0, 0) sits. Image Y grows down;
            game Y grows up.
          </li>
        </ul>

        <h2>1. Get the scale</h2>
        <p>
          Pick two places you can find both in the game and on the map image
          (landmarks, corners, signs). You need their in-game coordinates and
          their pixel positions on the picture.
        </p>
        <ol>
          <li>Stand at point A in the game and write down its coordinates.</li>
          <li>Stand at point B and write those down too.</li>
          <li>
            Open the map image and measure the distance in pixels between the
            same two spots (an image editor ruler or the pixel x/y of each
            point).
          </li>
          <li>Measure the distance in the game between those two points.</li>
        </ol>
        <pre className="guide-formula">{`pixels per unit = image distance in pixels / game distance in units`}</pre>
        <pre className="guide-formula">{`image distance = sqrt( (imgAx - imgBx)² + (imgAy - imgBy)² )
game distance  = sqrt( (gameAx - gameBx)² + (gameAy - gameBy)² )`}</pre>

        <h2>Worked example</h2>
        <p>
          Two known Palworld spots: Fast Travel at (-130, -79) and Anubis at
          (-134, -94). On the 8192×8192 map image, those same spots are pixels
          (4653, 2887) and (4641, 2925).
        </p>
        <div className="guide-shots">
          <figure>
            <img src="/guide/fast-travel.png" alt="Fast Travel at -130, -79" />
            <figcaption>Game A: Fast Travel (-130, -79)</figcaption>
          </figure>
          <figure>
            <img src="/guide/anubis.png" alt="Anubis at -134, -94" />
            <figcaption>Game B: Anubis (-134, -94)</figcaption>
          </figure>
          <figure>
            <img src="/guide/pixel-a.png" alt="Image pixel 4653, 2887" />
            <figcaption>Image A: (4653, 2887)</figcaption>
          </figure>
          <figure>
            <img src="/guide/pixel-b.png" alt="Image pixel 4641, 2925" />
            <figcaption>Image B: (4641, 2925)</figcaption>
          </figure>
        </div>
        <pre className="guide-formula">{`game distance  = sqrt( (-134 - -130)² + (-94 - -79)² )
                = sqrt( (-4)² + (-15)² ) = sqrt(241) ≈ 15.52

image distance = sqrt( (4641 - 4653)² + (2925 - 2887)² )
                = sqrt( (-12)² + 38² ) = sqrt(1588) ≈ 39.85

pixels per unit = 39.85 / 15.52 ≈ 2.57`}</pre>
        <p>Then origin from point A (Fast Travel):</p>
        <pre className="guide-formula">{`Origin X = 4653 − (-130 × 2.57) = 4653 + 334.1 ≈ 4987
Origin Y = 2887 + (-79 × 2.57) = 2887 − 203.0 ≈ 2684`}</pre>
        <p className="guide-note">
          Enter Origin X 4987, Origin Y 2684, and Pixels per unit 2.57. Place a
          marker at (-130, -79) and it should sit on the Fast Travel crater.
        </p>

        <h2>2. Get the origin</h2>
        <p>
          Origin is the pixel on the image where in-game <strong>X = 0, Y = 0</strong>.
          Markers are then placed relative to that point.
        </p>
        <p>
          After you have the scale, take one known point. You know its game
          coords and its pixel coords on the image.
        </p>
        <p className="guide-note">
          Origin is where in-game (0, 0) sits on the picture. Fast Travel is at
          image X = 4653 and is 130 game units away from 0 on X. That gap is
          130 × 2.57 ≈ 334 pixels. Game X is negative, so (0, 0) is to the
          right of the crater:
        </p>
        <pre className="guide-formula">{`Origin X = 4653 − (−130 × 2.57) = 4653 + 334.1 ≈ 4987`}</pre>
        <figure className="guide-diagram">
          <img
            src="/guide/origin-diagram.png"
            alt="Line from Fast Travel crater at image 4653 to in-game origin at image 4987, 2684"
          />
          <figcaption>
            Same step on Y: 4987×2684 on the image is in-game (0, 0).
          </figcaption>
        </figure>
        <p>
          Same idea on Y: distance from 0, times scale, then step toward (0, 0)
          on the image. The general form is:
        </p>
        <pre className="guide-formula">{`Origin X = image X − (game X × pixels per unit)
Origin Y = image Y + (game Y × pixels per unit)`}</pre>
        <p>
          The plus on Y is because the image counts down from the top, while
          the game counts up.
        </p>
        <p className="guide-note">
          Shortcut: if you can mark in-game (0, 0) on the picture, those pixel
          coordinates are Origin X and Origin Y. You still need pixels per unit
          from two points.
        </p>

        <h2>3. Put them on the map</h2>
        <ol>
          <li>Open the map widget and enable Coordinates feature.</li>
          <li>Enter Origin X, Origin Y, and Pixels per unit.</li>
          <li>
            Place a test marker at a known in-game position and check it lines
            up on the image. If it is offset the same way everywhere, the
            origin is wrong. If distances are stretched, the scale is wrong.
          </li>
        </ol>
      </article>
    </main>
  );
}
