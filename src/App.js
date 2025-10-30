import { useState,useEffect } from "react";
import "./App.css";
import { AuthComponent } from "./component/auth";
import {db} from './config/firebase';
import {getDocs,collection,addDoc,doc,deleteDoc} from 'firebase/firestore';

function App() {
    const [movieList,setMovieList]=useState([]);
    const moviesCollectionRef=collection(db,"movies");
    const [newMovieTitle, setNewMovieTitle] = useState("");
    const [newReleaseDate, setNewReleaseDate] = useState(0);
    const [isNewMovieOscar, setisNewMovieOscar] = useState(false);


    const getMovieList=async()=>{
            try{
                const data=await getDocs(moviesCollectionRef);
                const filteredData=data.docs.map((doc)=>({ ...doc.data(), id: doc.id }));
                // console.log(filteredData);
                setMovieList(filteredData);
            }catch(err){
                console.error("Error fetching movie list: ", err);
            }
        };
    useEffect(()=>{
        
        getMovieList();
    },[]);
    const deleteMovie = async (id) => {
const movieDoc = doc(db, "movies", id);
await deleteDoc(movieDoc);
};

    const onSubmitMovie = async () => {
try {
await addDoc(moviesCollectionRef, {
title: newMovieTitle,
releaseDate: newReleaseDate,
receivedAnOscar: isNewMovieOscar,
});
getMovieList();
} catch (err){
    console.error(err);
}


};

    return <div className="App"><AuthComponent />
    <div>
<input
placeholder="Movie title ... "
onChange={(e) => setNewMovieTitle(e.target.value)}
/>
<input
placeholder="Release Date ... "
type="number"
onChange={(e) => setNewReleaseDate(Number(e.target.value))}
/>
<input
type="checkbox"
checked={isNewMovieOscar}
onChange={(e) => setisNewMovieOscar(e.target.checked)}
/>
<label> Received an Oscar</label>
<button onClick ={onSubmitMovie}> Submit Movie</button>
</div>
    <div>
  {movieList.map((movie) => (
    <div key={movie.id}>
      <h1 style={{ color: movie.receivedAnOscar ? "green" : "red" }}>
        {movie.title}
      </h1>
      <p>Date: {movie.releaseDate}</p>
        <button onClick={() => deleteMovie(movie.id)}>Delete Movie</button>
    </div>
  ))}
</div>

    </div>;
}

export default App;
