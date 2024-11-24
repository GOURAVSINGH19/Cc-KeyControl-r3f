import React, { useEffect, useRef, useState } from "react";
import { Character } from "./Character";
import { CapsuleCollider, RigidBody } from "@react-three/rapier";
import { MathUtils, Vector3 } from "three";
import { useFrame } from "@react-three/fiber";
import { useControls } from "leva";
import { useKeyboardControls } from "@react-three/drei";
import { degToRad } from "three/src/math/MathUtils.js";

//it calc the shortest path when we go backwards form forward direction
//if we don't use it our char rotate 360deg
const normalizeAngle = (angle) => {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
};

const lerpAngle = (start, end, t) => {
  start = normalizeAngle(start);
  end = normalizeAngle(end);

  if (Math.abs(end - start) > Math.PI) {
    if (end > start) {
      start += 2 * Math.PI;
    } else {
      end += 2 * Math.PI;
    }
  }

  return normalizeAngle(start + (end - start) * t);
};

const CharacterControler = () => {
  const { Walk_speed, Run_speed, Rotation_speed, jump } = useControls(
    "CharacterControler",
    {
      Walk_speed: { value: 0.8, min: 0, max: 4, step: 0.1 },
      Run_speed: { value: 1.6, min: 0, max: 2, step: 0.01 },
      Rotation_speed: {
        value: degToRad(0.5),
        min: degToRad(0.1),
        max: degToRad(5),
        step: degToRad(0.1),
      },
      jump: {
        value: false,
        min: 0,
        max: 3,
      },
    }
  );

  const rotationTarget = useRef(0);
  const CharacterTarget = useRef(0);

  const rb = useRef();
  const container = useRef();
  const character = useRef();
  const cameraTarget = useRef();
  const cameraPosition = useRef();
  const cameraWorldPosition = useRef(new Vector3());
  const cameraLookAtWorldPosition = useRef(new Vector3());
  const cameraLookAt = useRef(new Vector3());
  const [, get] = useKeyboardControls();
  const isGrounded = useState(false);

  const isClicking = useRef(false);

  useEffect(() => {
    const onMouseDown = (e) => {
      isClicking.current = true;
    };
    const onMouseUp = (e) => {
      isClicking.current = false;
    };

    const handleKeyDown = (event) => {
      if (event.code === "Space") {
        // Trigger jump when space is pressed
        if (isGrounded.current) {
          rb.current.setLinvel(
            { x: rb.current.linvel().x, y: 4, z: rb.current.linvel().z },
            true
          );
          isGrounded.current = false; // Set grounded to false after jumping
          setAnimation("jump"); // Set jump animation
        }
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("keydown", handleKeyDown);
    //for mobile devices
    document.addEventListener("touchstart", onMouseUp);
    document.addEventListener("touchend", onMouseUp);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
      document.addEventListener("touchstart", onMouseUp);
      document.addEventListener("touchend", onMouseUp);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isGrounded]);

  const [animation, setAnimation] = useState("idel");

  useFrame(({ camera, mouse }) => {
    //character move
    if (rb.current) {
      const vel = rb.current.linvel();

      const movement = {
        x: 0,
        z: 0,
        y: 0,
      };

      if (get().forward) {
        movement.z = 1;
      }
      if (get().backward) {
        movement.z = -1;
      }

      let speed = get().run ? Run_speed : Walk_speed;

      //   clicking
      if (isClicking.current) {
        if (Math.abs(mouse.x) > 0.1) {
          movement.x = -mouse.x;
        }
        movement.z = mouse.y + 0.4;
        if (Math.abs(movement.x) > 0.5 || Math.abs(movement.z) > 0.5) {
          speed = Run_speed;
        }
      }

      if (get().left) {
        movement.x = 1;
      }
      if (get().right) {
        movement.x = -1;
      }

      if (Math.abs(vel.y) < 0.01) {
        isGrounded.current = true; // Set grounded to true if vertical velocity is low
      }

      if (movement.x !== 0) {
        rotationTarget.current += movement.x * Rotation_speed;
      }

      if (movement.x !== 0 || movement.z !== 0) {
        CharacterTarget.current = Math.atan2(movement.x, movement.z);
        vel.z =
          speed * Math.cos(rotationTarget.current + CharacterTarget.current);
        vel.x =
          speed * Math.sin(rotationTarget.current + CharacterTarget.current);

        if (speed == Run_speed) {
          setAnimation("run");
        } else {
          setAnimation("walk");
        }
      } else {
        setAnimation("idel");
      }

      character.current.rotation.y = lerpAngle(
        character.current.rotation.y,
        CharacterTarget.current,
        0.1
      );

      rb.current.setLinvel(vel, true);
    }

    // camera
    container.current.rotation.y = MathUtils.lerp(
      container.current.rotation.y,
      rotationTarget.current,
      0.1
    );

    cameraPosition.current.getWorldPosition(cameraWorldPosition.current);
    camera.position.lerp(cameraWorldPosition.current, 0.1);

    if (cameraTarget.current) {
      cameraTarget.current.getWorldPosition(cameraLookAtWorldPosition.current);
      cameraLookAt.current.lerp(cameraLookAtWorldPosition.current, 0.1);

      camera.lookAt(cameraLookAt.current);
    }
  });

  return (
    <RigidBody colliders={false} lockRotations  ref={rb} position={[0,1,0]} >
      <group ref={container}>
        <group ref={cameraTarget} position-z={1.8} />
        <group ref={cameraPosition} position-y={4} position-z={-4} />
        <group ref={character}>
          <Character scale={0.18} position-y={-0.25} animation={animation} />
        </group>
      </group>
      <CapsuleCollider args={[0.08, 0.15]} />
    </RigidBody>
  );
};

export default CharacterControler;
