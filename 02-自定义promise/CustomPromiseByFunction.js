function CustomPromiseByFunction (executor) {
  this._promiseStateMap = {
    PENDING: 'pending',
    FULFILLED: 'fulfilled',
    REJECTED: 'rejected'
  }
  // 对象的状态
  this.PromiseState = this._promiseStateMap.PENDING
  // 对象的结果
  this.PromiseResult = undefined
  // 回调函数的数组
  this.callbackList = []
  var that = this
  // resolve 函数，唯一将状态从 pending变为fulfilled的方法
  function resolve(result) {
    if (that.PromiseState !== that._promiseStateMap.PENDING) return
    // console.log('CustomPromiseByFunction===resolve(result)');
    that.PromiseState = that._promiseStateMap.FULFILLED
    that.PromiseResult = result
    setTimeout(() => {
      that.callbackList.forEach(item => {
        item.onResolved(that.PromiseResult)
      })
    })
  }

  // reject 函数，唯一将状态从 pending变为rejected的方法
  function reject(reason) {
    if (that.PromiseState !== that._promiseStateMap.PENDING) return
    // console.log('CustomPromiseByFunction===reject(result)');
    that.PromiseState = that._promiseStateMap.REJECTED
    that.PromiseResult = reason
    setTimeout(() => {
      that.callbackList.forEach(item => {
        item.onRejected(that.PromiseResult)
      })
    })
  }

  // 同步调用 executor 执行器函数
  // 改变 promise 对象的状态共3种方式,在执行器函数中：
  // 1. 调用 resolve 方法，PromiseState 变为 fulfilled 状态
  // 2. 调用 reject 方法，PromiseState 变为 rejected 状态
  // 3. 抛出错误，PromiseState 变为 rejected 状态

  try { // 捕获执行器函数内抛出的错误，进而改变 promise 对象的状态
    executor(resolve,reject)
  } catch (error) {
    // 调用 reject 方法，改变 promise 对象的状态
    reject(error)
  }


}

/**
 * @param successCb
 * @param failCb
 * @return {CustomPromiseByFunction}
 * then方法执行后返回值仍然是一个promise对象。
 * then方法里的回调函数需要在new Promise时传入的executor执行器函数内，调用 resolve或者reject函数后才能调用，
 * 即：1. 如果在executor执行器函数内是同步调用resolve或者reject的，那么代码运行到then方法时，因为已经调用过resolve或reject方法了，
 * promise的状态已经为fulfilled或rejected了，则此时就可以直接调用回调函数
 * 2. 如果在executor执行器函数内是异步调用resolve或者reject的，那么当代码运行到then方法时，因为resolve或reject方法为异步调用，
 * 即加入了异步队列中，此时promise的状态为pending状态，且因为resolve或reject方法未调用，所以此时不能调用回调函数，
 * 那么就需要把回调函数保存到 callbackList 回调函数数组中，等到resolve或reject方法调用时，再将回调函数取出来进行调用。
 */
CustomPromiseByFunction.prototype.then = function (successCb, failCb) {

  if (typeof successCb !== 'function') {
    // console.log("typeof successCb !== 'function'");
    successCb = value => value
  }
  if (typeof failCb !== 'function') {
    // console.log("typeof failCb !== 'function'");
    failCb = err => { throw err }
  }

  // then方法执行后返回值仍然是一个promise对象
  return new CustomPromiseByFunction((resolve,reject) => {

    if (this.PromiseState === this._promiseStateMap.FULFILLED) {
      /*try {
        const result = successCb && successCb(this.PromiseResult)
        // console.log('CustomPromiseByFunction.prototype.then===result:', result);
        /!*
          successCb 回调函数执行的返回值是一个 promise 对象，则then方法执行后返回的新promise对象的状态由【successCb返回的promise对象的状态决定】，
          且新promise对象的结果为successCb返回的promise对象的结果
          如何知道successCb返回的promise对象的状态和结果呢？调用successCb返回的promise对象的then方法
        *!/
        if (result instanceof CustomPromiseByFunction) {
          // 第一个回调被调用，则证明successCb返回的promise对象的状态为 fulfilled ，则需要调用 resolve，将结果 v 往下传
          result.then(v => {
              resolve(v)
            },
            // 第二个回调被调用，则证明successCb返回的promise对象的状态为 rejected ，则需要调用 reject，将结果 e 往下传
            e => {
              reject(e)
            })
        } else { // successCb 回调函数执行的返回值不是一个 promise 对象，则返回的新 promise 对象的状态为 fulfilled，结果为回调函数的返回值
          resolve(result)
        }
      } catch (error) { // successCb 回调函数执行里抛出错误，返回的新 promise 对象的状态为 rejected ，则需要调用 reject，将结果捕获的错误 error 往下传
        // console.error(error);
        reject(error)
      }*/
      setTimeout(() => {
        handleThenCb(successCb,this.PromiseResult,resolve,reject)
      })

    }

    if (this.PromiseState === this._promiseStateMap.REJECTED) {
      // const result = failCb && failCb(this.PromiseResult)
      setTimeout(() => {
        handleThenCb(failCb,this.PromiseResult,resolve,reject)
      })
    }

    /*
    当执行器函数内为异步操作时，则此时状态为 pending，resolve方法和reject方法是改变状态的唯一方式，要想改变状态，则需要调用这两个方法
    且在调用 resolve 或 reject 后，需要执行 successCb 或 failCb 回调，那么就需要将回调函数 successCb 或 failCb存起来，在 resolve 和 reject方法中进行调用
    但是不能直接将 successCb 或 failCb 存起来，因为需要改变then方法调用后返回的新promise对象的结果和状态，所以保存的函数为onResolved和onRejected
    在这两个函数中改变新promise对象的结果和状态，且调用 successCb 或 failCb 回调
    */
    if (this.PromiseState === this._promiseStateMap.PENDING) {
      // 保存回调函数
      this.callbackList.push({
        onResolved(data) {
          // console.log(' successCb(data)===data:',data);
          handleThenCb(successCb,data,resolve,reject)
        },
        onRejected(data) {
          // console.log(' failCb(data)===data:',data);
          handleThenCb(failCb,data,resolve,reject)
        }
      })
    }
  })
}

/**
 * 指定失败的回调函数，可以调用then方法实现，因为then方法的功能已经实现
 * @param failCb
 */
CustomPromiseByFunction.prototype.catch = function (failCb) {
  return this.then(undefined,failCb)
}

/**
 * resolve方法返回一个promise对象，如果传入的非promise对象，那么返回一个fulfilled状态的promise对象
 * 如果传入的参数是promise对象，那么返回的promise对象的状态由传入的promise对象决定
 * @param value
 * @return {CustomPromiseByFunction}
 */
CustomPromiseByFunction.resolve = function (value) {
  return new CustomPromiseByFunction((resolve, reject) => {
    if (value instanceof CustomPromiseByFunction) {
      value.then(res => resolve(value),err => reject(value))
    } else {
      resolve(value)
    }
  })
}

/**
 * reject方法始终返回一个rejected状态的promise对象，返回的promise对象的结果为传入的值
 * @param value
 * @return {CustomPromiseByFunction}
 */
CustomPromiseByFunction.reject = function (value) {
  return new CustomPromiseByFunction((resolve, reject) => reject(value))
}

/**
 * all方法接收一个promise对象数组，当数组内的所有promise对象都变为fulfilled状态后，返回的promise对象才变为fulfilled，
 * 且结果为接收的promise对象数组的所有结果构成的数组，且结果数组顺序与接收的promise对象数组参数的顺序一致
 * 当参数数组内任一一个promise对象的状态变为 rejected 状态时，返回的promise对象的状态就变为 rejected ，结果为失败的这个promise对象的结果
 * @param promiseList
 * @return {CustomPromiseByFunction}
 */
CustomPromiseByFunction.all = function (promiseList) {
  return new CustomPromiseByFunction((resolve, reject) => {
    let fulfilledCount = 0
    const resultArr = []
    for (let i = 0, len = promiseList.length; i < len; i++) {
      promiseList[i].then(res => {
        resultArr[i] = res
        fulfilledCount++
        if (fulfilledCount === len) {
          resolve(resultArr)
        }
      },err => {
        reject(err)
      })

    }
  })
}

/**
 * race接收一个promise对象数组，返回一个promise对象。当数组内的任意一个promise对象改变状态时，不管是变为fulfilled还是rejected，
 * 那么返回的promise对象的状态也随之改变，状态和结果与其保持一致
 * @param promiseList
 * @return {CustomPromiseByFunction}
 */
CustomPromiseByFunction.race = function (promiseList) {
  return new CustomPromiseByFunction((resolve, reject) => {
    for (let i = 0, len = promiseList.length; i < len; i++) {
      promiseList[i].then(res => {
        resolve(res)
      },err => {
        reject(err)
      })
    }
  })
}


/**
 * 调用 successCb 或 failCb 回调，和改变then方法调用后返回的新promise对象状态和结果的函数
 * @param cb
 * @param value
 * @param resolve
 * @param reject
 */
function handleThenCb(cb, value, resolve, reject) {
  try {
    const result = cb(value)
    // console.log('CustomPromiseByFunction.prototype.then===result:', result);
    /*
      successCb 回调函数执行的返回值是一个 promise 对象，则then方法执行后返回的新promise对象的状态由【successCb返回的promise对象的状态决定】，
      且新promise对象的结果为successCb返回的promise对象的结果
      如何知道successCb返回的promise对象的状态和结果呢？调用successCb返回的promise对象的then方法
    */
    if (result instanceof CustomPromiseByFunction) {
      // 第一个回调被调用，则证明successCb返回的promise对象的状态为 fulfilled ，则需要调用 resolve，将结果 v 往下传
      result.then(v => {
          resolve(v)
        },
        // 第二个回调被调用，则证明successCb返回的promise对象的状态为 rejected ，则需要调用 reject，将结果 e 往下传
        e => {
          reject(e)
        })
    } else { // successCb 回调函数执行的返回值不是一个 promise 对象，则返回的新 promise 对象的状态为 fulfilled，结果为回调函数的返回值
      resolve(result)
    }
  } catch (error) { // successCb 回调函数执行里抛出错误，返回的新 promise 对象的状态为 rejected ，则需要调用 reject，将结果捕获的错误 error 往下传
    // console.error(error);
    reject(error)
  }
}
