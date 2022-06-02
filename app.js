const csv = require("csv-parser");
const fs = require("fs");
const args = process.argv.slice(2);
const myData = {};
let newData = {};
const err = { error: "Invalid course weights" };

//Reading csv files
const readCsv = (arg) =>
  new Promise((resolve, reject) => {
    myData[arg.split(".csv").join("")] = [];
    fs.createReadStream(`${__dirname}/csv/${arg}`)
      .pipe(csv())
      .on("data", (row) => {
        myData[arg.split(".csv").join("")].push(row);
      })
      .on("end", () => {
        console.log("CSV file done");

        resolve(myData);
      })
      .on("error", (error) => reject(new Error(`Error: ${error}`)));
  });

//Adding weight and number of tests to courses and checking weight. Returning courses object
const updateCourses = (courses, tests) => {
  const coursesObj = {};
  //make a courses object
  courses.map((course) => {
    coursesObj[course.id] = course;
    coursesObj[course.id].totalTests = 0;
    coursesObj[course.id].totalWeight = 0;
  });
  tests.map((test) => {
    coursesObj[test.course_id].totalTests++;
    coursesObj[test.course_id].totalWeight += parseInt(test.weight);
    //check weight
    if (coursesObj[test.course_id].totalWeight !== 100) {
      coursesObj[test.course_id].isWeightRight = false;
    } else {
      coursesObj[test.course_id].isWeightRight = true;
    }
  });

  return coursesObj;
};

//Adding course id and weight to marks
const updateMarks = (marks, tests) => {
  marks.map((mark) => {
    mark.course_id = tests[mark.test_id - 1].course_id;
    mark.weight = tests[mark.test_id - 1].weight;
  });
  return marks;
};

//adding courses to students and calculating avg for every course
const addingCoursesToStudents = (students, marks) => {
  const studentsObj = {};
  //create students object
  students.map((student) => {
    studentsObj[student.id] = student;
    studentsObj[student.id].totalAvg = 0;
    studentsObj[student.id].courses = {};
  });
  //adding obj of courses with course id as key to each student
  marks.map((mark) => {
    let coursesObj = studentsObj[mark.student_id].courses;
    let tempmark = (mark.mark * mark.weight) / 100;
    if (!coursesObj[mark.course_id]) {
      coursesObj[mark.course_id] = tempmark;
    } else {
      coursesObj[mark.course_id] += tempmark;
    }

    studentsObj[mark.student_id].totalAvg += tempmark;
  });
  return studentsObj;
};
//Creating courses array and calculating total avg
const totalAvg = (students, courses) => {
  students.map((student) => {
    let coursesArr = [];
    for (const prop in student.courses) {
      //if test weight is wrong assign error message to newData
      if (!courses[prop].isWeightRight) {
        newData = err;
      } else {
        let courseObj = {};
        courseObj.id = courses[prop].id;
        courseObj.name = courses[prop].name;
        courseObj.teacher = courses[prop].teacher;
        courseObj.courseAverage = student.courses[prop];
        coursesArr.push(courseObj);
      }
    }
    student.courses = coursesArr;
    student.totalAvg = (student.totalAvg / coursesArr.length).toFixed(2);
  });

  return students;
};

//all the calcultions go here
async function createCard() {
  try {
    //Getting all the data
    const allData = await Promise.all(args.map((arg) => readCsv(arg)));
    const [{ courses }, { marks }, { students }, { tests }] = allData;

    myData.courses = updateCourses(courses, tests);
    myData.marks = updateMarks(marks, tests);
    addingCoursesToStudents(students, marks);
    //if there's no error, assign orginized data to newData
    if (newData !== err) {
      newData.students = totalAvg(students, myData.courses);
    }

    //Writing to Json file
    const stringified = JSON.stringify(newData);
    fs.writeFile(`${__dirname}/csv/myJason.json`, stringified, (err) => {
      if (err) {
        console.error(err);
      }
      console.log("Finished!");
    });
  } catch (error) {
    console.error("testGetData: An error occurred: ", error.message);
  }

  function newFunction() {
    return "tests.csv";
  }
}

createCard();
