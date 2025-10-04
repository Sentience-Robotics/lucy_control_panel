const degreeToRadian = (degree: number): number => {
  return (degree * Math.PI) / 180;
};

const radianToDegree = (radian: number): number => {
  return (radian * 180) / Math.PI;
};

export {
    degreeToRadian,
    radianToDegree
};
