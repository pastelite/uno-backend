import e, { Router, Response } from "express";
var router = Router();

const docs: { [key: string]: any } = {
  lobby: {
    _docs: [
      {
        type: "get",
        info: "list of all room",
        body: {
          a: "asdaweqwe b",
          c: "asdaeqweqwe d"
        }
      }
    ],
    lala: {
      _docs:
        [
          {
            type: "get",
            info: "list of all room",
            body: {
              a: "asdaweqwe b",
              c: "asdaeqweqwe d"
            }
          }
        ]
    }
  }
}

router.use('/*', (req, res, next) => {
  // @ts-ignore (it's work bro)
  let pathList = req.params['0'].split('/').filter(e => e != "")
  if (pathList.length == 0) {
    // get list of childs
    let childList = Object.keys(docs)
    let docsIndex = childList.indexOf("_docs")
    if (docsIndex !== -1) {
      childList.splice(docsIndex, 1);
    }

    res.status(200).render('doc', {
      path: [],
      docsList: [{
        type: "",
        info: "Welcome to the documentation!. you can start browsing by clicking that childs below",
      }],
      childList
    })
  } else {
    showDocs(pathList, res)
  }
  
})

// router.use('/:a/:b/',(req,res,next)=>{
//   // let pathList = [req.params.a,req.params.b]

//   // showDocs(pathList,res)
// })

function showDocs(pathList: string[], res: Response) {
  let docsinfo = docs[pathList[0]]
  for (let index of pathList) {
    if (!docsinfo) {
      return res.status(404).send("No docs")
    }

    if (index == pathList[0]) continue
    docsinfo = docsinfo[index]
  }

  // console.log(docsinfo)
  if (!docsinfo) {
    return res.status(404).send("No docs")
  }

  let childList = Object.keys(docsinfo)
  let docsIndex = childList.indexOf("_docs")
  if (docsIndex !== -1) {
    childList.splice(docsIndex, 1);
  }

  res.status(200).render('doc', {
    path: pathList,
    docsList: docsinfo._docs,
    childList
  })
}

module.exports = router;